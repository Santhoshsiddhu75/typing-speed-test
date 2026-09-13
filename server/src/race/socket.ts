import type { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import {
  beginCountdown,
  createRoom,
  finishPlayer,
  getRoom,
  joinRoom,
  markRacing,
  removePlayer,
  sweepStaleRooms,
  updateProgress,
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

function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().slice(0, 16) : ''
  return name || 'Player'
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

function isTimer(value: unknown): value is Timer {
  return value === 1 || value === 2 || value === 5
}

/**
 * Realtime for head-to-head races.
 *
 * The server is the authority on three things and nothing else: which players
 * are in a room, what seed they share, and when the race starts and ends.
 * Speed and accuracy are still calculated in the browser — deliberately, since
 * races are played between people who swapped a room code, and validating
 * every keystroke would cost far more than it protects.
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

  io.on('connection', (socket: Socket) => {
    socket.on('race:create', (payload, ack) => {
      const difficulty = isDifficulty(payload?.difficulty) ? payload.difficulty : 'medium'
      const timer = isTimer(payload?.timer) ? payload.timer : 1

      const room = createRoom(socket.id, cleanName(payload?.name), difficulty, timer)
      socket.join(room.code)

      if (typeof ack === 'function') ack({ ok: true, room, you: socket.id })
      broadcast(room)
    })

    socket.on('race:join', (payload, ack) => {
      const code = String(payload?.code ?? '').trim()
      const result = joinRoom(code, socket.id, cleanName(payload?.name))

      if (!result.ok) {
        if (typeof ack === 'function') ack({ ok: false, reason: result.reason })
        return
      }

      socket.join(code)
      if (typeof ack === 'function') ack({ ok: true, room: result.room, you: socket.id })

      // Both seats filled, so start the clock.
      if (Object.keys(result.room.players).length === 2) {
        beginCountdown(result.room)
        const startsIn = (result.room.startAt ?? Date.now()) - Date.now()
        setTimeout(() => {
          const live = getRoom(code)
          if (live) {
            markRacing(live)
            broadcast(live)
          }
        }, Math.max(0, startsIn))
      }

      broadcast(result.room)
    })

    socket.on('race:progress', (payload) => {
      const room = getRoom(String(payload?.code ?? ''))
      if (!room) return

      updateProgress(
        room,
        socket.id,
        Number(payload?.progress) || 0,
        Number(payload?.wpm) || 0,
        Number(payload?.accuracy) || 0
      )

      // Lighter than a full state broadcast, and this fires several times a
      // second per player.
      socket.to(room.code).emit('race:opponent', {
        id: socket.id,
        progress: room.players[socket.id]?.progress ?? 0,
        wpm: room.players[socket.id]?.wpm ?? 0,
        accuracy: room.players[socket.id]?.accuracy ?? 100,
      })
    })

    socket.on('race:finish', (payload) => {
      const room = getRoom(String(payload?.code ?? ''))
      if (!room) return

      finishPlayer(room, socket.id, Number(payload?.wpm) || 0, Number(payload?.accuracy) || 0)
      broadcast(room)
    })

    socket.on('race:leave', () => {
      const room = removePlayer(socket.id)
      if (room) broadcast(room)
    })

    socket.on('disconnect', () => {
      const room = removePlayer(socket.id)
      if (room) broadcast(room)
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
