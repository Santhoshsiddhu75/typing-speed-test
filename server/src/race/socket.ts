import type { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import {
  SEAT_GRACE_MS,
  beginCountdown,
  createRoom,
  endRace,
  expireDroppedSeat,
  finishPlayer,
  getRoom,
  joinRoom,
  markRacing,
  peekRoom,
  removePlayer,
  requestRematch,
  resumeSeat,
  setReady,
  sweepStaleRooms,
  updateProgress,
  type Departure,
  type Difficulty,
  type Room,
  type Timer,
} from './rooms.js'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://192.168.29.20:5173',
  'https://taptest.in',
  'https://www.taptest.in',
  'https://taptest-snowy.vercel.app',
]

const SWEEP_EVERY_MS = 10 * 60 * 1000

/**
 * The server stops a race this long after its clock runs out. Clients stop
 * themselves at the deadline and report; this is only the backstop for one
 * that cannot, and the margin lets an on-time report land first.
 */
const DEADLINE_GRACE_MS = 1500

function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().slice(0, 8) : ''
  return name || 'Player'
}

/** Seat keys are opaque tokens minted by the client. Anything else is no key. */
function cleanKey(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(value) ? value : ''
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

function isTimer(value: unknown): value is Timer {
  return value === 1 || value === 2 || value === 5
}

function reply(ack: unknown, payload: unknown) {
  if (typeof ack === 'function') ack(payload)
}

/**
 * Realtime for head-to-head races.
 *
 * The server is the authority on who is seated in a room, what seed they
 * share, and when the race starts and ends. Speed and accuracy are still
 * calculated in the browser — deliberately, since races are played between
 * people who swapped a room code, and validating every keystroke would cost
 * far more than it protects.
 *
 * Every event that changes a room is honoured only from a player seated in
 * it, and only in the state it belongs to. A six-digit code is easy to guess
 * or to leave in a chat, and a stale tab replays old messages.
 */
export function attachRaceSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: '/race-socket',
    cors: { origin: ALLOWED_ORIGINS, credentials: true },
    // Races are short; a dead connection should be noticed quickly.
    pingInterval: 10_000,
    pingTimeout: 8_000,
  })

  const broadcast = (room: Room) => {
    io.to(room.code).emit('race:state', room)
  }

  /** One seat per connection: take this socket out of the room it holds, and tell whoever stays. */
  const vacate = (socket: Socket, how: Departure, exceptCode?: string) => {
    const result = removePlayer(socket.id, how, exceptCode)
    if (!result) return
    socket.leave(result.code)
    if (result.room) broadcast(result.room)
  }

  /**
   * The countdown is a server timestamp rather than a duration, so both
   * screens hit zero together however long the message took to arrive.
   * `startAt` identifies this particular race: a timer left over from an
   * earlier race in the same room must not start or end a rematch.
   */
  const startCountdown = (room: Room) => {
    beginCountdown(room)
    const { code, startAt, endAt } = room

    setTimeout(() => {
      const live = getRoom(code)
      if (live && live.status === 'countdown' && live.startAt === startAt) {
        markRacing(live)
        broadcast(live)
      }
    }, Math.max(0, (startAt ?? 0) - Date.now()))

    const deadline = setTimeout(() => {
      const live = getRoom(code)
      if (live && live.status === 'racing' && live.startAt === startAt) {
        endRace(live)
        broadcast(live)
      }
    }, Math.max(0, (endAt ?? 0) - Date.now() + DEADLINE_GRACE_MS))
    deadline.unref?.()
  }

  io.on('connection', (socket: Socket) => {
    /**
     * Clock sync. Every timestamp the server sends is its own epoch, and
     * browser clocks routinely sit seconds away from it. The client pings
     * this, halves the round trip, and works out its offset — without it the
     * countdown ends at visibly different moments on the two screens.
     */
    socket.on('race:sync', (_payload, ack) => {
      reply(ack, { serverNow: Date.now() })
    })

    socket.on('race:create', (payload, ack) => {
      const difficulty = isDifficulty(payload?.difficulty) ? payload.difficulty : 'medium'
      const timer = isTimer(payload?.timer) ? payload.timer : 1

      vacate(socket, 'left')
      const room = createRoom(socket.id, cleanName(payload?.name), difficulty, timer, cleanKey(payload?.key))
      socket.join(room.code)

      reply(ack, { ok: true, room, you: socket.id })
      broadcast(room)
    })

    // Where a code leads, asked before the joiner is asked for a name. It takes
    // no seat and changes nothing, so it needs no seat either.
    socket.on('race:peek', (payload, ack) => {
      reply(ack, peekRoom(String(payload?.code ?? '').trim()))
    })

    socket.on('race:join', (payload, ack) => {
      const code = String(payload?.code ?? '').trim()
      const result = joinRoom(code, socket.id, cleanName(payload?.name), cleanKey(payload?.key))

      if (!result.ok) {
        reply(ack, { ok: false, reason: result.reason })
        return
      }

      // Only once the new seat is certain does the old one go.
      vacate(socket, 'left', code)
      socket.join(code)
      reply(ack, { ok: true, room: result.room, you: socket.id })

      // Filling the seat starts nothing. Both players arm themselves with
      // race:ready, and that is what runs the clock.
      broadcast(result.room)
    })

    /**
     * A player coming back after a dropped connection, or after the page was
     * reloaded. They arrive under a new socket id and prove the seat is theirs
     * with the key they were seated with.
     */
    socket.on('race:resume', (payload, ack) => {
      const code = String(payload?.code ?? '').trim()
      const result = resumeSeat(code, cleanKey(payload?.key), socket.id)

      if (!result.ok) {
        reply(ack, { ok: false, reason: result.reason })
        return
      }

      // If the old connection is somehow still open, it no longer speaks for this seat.
      if (result.previousId !== socket.id) io.in(result.previousId).socketsLeave(code)
      socket.join(code)
      reply(ack, { ok: true, room: result.room, you: socket.id })
      broadcast(result.room)
    })

    socket.on('race:ready', (payload, ack) => {
      const room = getRoom(String(payload?.code ?? ''))
      if (!room || !room.players[socket.id]) {
        reply(ack, { ok: false })
        return
      }

      const bothArmed = setReady(room, socket.id, payload?.ready !== false)
      reply(ack, { ok: true })

      if (bothArmed) startCountdown(room)
      broadcast(room)
    })

    socket.on('race:progress', (payload) => {
      const room = getRoom(String(payload?.code ?? ''))
      if (!room || room.status !== 'racing' || !room.players[socket.id]) return

      updateProgress(
        room,
        socket.id,
        Number(payload?.progress) || 0,
        Number(payload?.wpm) || 0,
        Number(payload?.accuracy) || 0
      )

      // Lighter than a full state broadcast, and this fires several times a
      // second per player.
      const player = room.players[socket.id]
      socket.to(room.code).emit('race:opponent', {
        id: socket.id,
        progress: player.progress,
        wpm: player.wpm,
        accuracy: player.accuracy,
      })
    })

    socket.on('race:finish', (payload) => {
      const room = getRoom(String(payload?.code ?? ''))
      if (!room || room.status !== 'racing' || !room.players[socket.id]) return

      finishPlayer(room, socket.id, Number(payload?.wpm) || 0, Number(payload?.accuracy) || 0)
      broadcast(room)
    })

    socket.on('race:rematch', (payload, ack) => {
      const result = requestRematch(String(payload?.code ?? ''), socket.id)

      if (!result.ok) {
        reply(ack, { ok: false, reason: result.reason })
        return
      }

      reply(ack, { ok: true })
      broadcast(result.room)
    })

    socket.on('race:leave', () => {
      vacate(socket, 'left')
    })

    socket.on('disconnect', () => {
      const id = socket.id
      const result = removePlayer(id, 'dropped')
      if (!result) return
      if (result.room) broadcast(result.room)

      // Hold the seat for the grace period, then give it up if they never came back.
      const expiry = setTimeout(() => {
        const expired = expireDroppedSeat(id)
        if (expired?.room) broadcast(expired.room)
      }, SEAT_GRACE_MS + 50)
      expiry.unref?.()
    })
  })

  const sweeper = setInterval(() => {
    const removed = sweepStaleRooms()
    if (removed > 0) console.log(`🧹 swept ${removed} stale race room(s)`)
  }, SWEEP_EVERY_MS)

  // Never hold the process open just for the sweeper.
  if (typeof sweeper.unref === 'function') sweeper.unref()

  return io
}
