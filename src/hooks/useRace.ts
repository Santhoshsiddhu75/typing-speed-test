import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type TimerOption = 1 | 2 | 5
export type RoomStatus = 'waiting' | 'countdown' | 'racing' | 'finished'

export interface RacePlayer {
  id: string
  name: string
  progress: number
  wpm: number
  accuracy: number
  finished: boolean
  connected: boolean
  /** Armed for the next race. Both seats must say yes before a countdown. */
  ready: boolean
  /** In the lobby for the next race. False while still on the last result. */
  inLobby: boolean
}

export interface Room {
  code: string
  hostId: string
  difficulty: Difficulty
  timer: TimerOption
  seed: number
  status: RoomStatus
  players: Record<string, RacePlayer>
  startAt: number | null
  endAt: number | null
}

export type JoinFailure = 'not-found' | 'full' | 'in-progress'

/** Where a code leads before anyone joins: who is waiting, and what they chose. */
export interface RoomPreview {
  code: string
  opponent: string
  difficulty: Difficulty
  timer: TimerOption
}

/**
 * The API base without the /api suffix — the socket lives at the root.
 * Same choices as src/lib/api.ts, including the LAN address a phone uses to
 * reach the dev servers; without it a phone on the Wi-Fi was sent to the
 * production race server instead.
 */
function socketOrigin(): string {
  const { hostname } = window.location
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    (hostname === 'localhost'
      ? 'http://localhost:3003/api'
      : hostname === '192.168.29.20'
        ? 'http://192.168.29.20:3003/api'
        : 'https://web-production-abb30.up.railway.app/api')

  return base.replace(/\/api\/?$/, '')
}

const SEAT_STORAGE = 'tt-race-seat'

interface StoredSeat {
  code: string
  key: string
}

/**
 * The seat this tab holds, kept in sessionStorage so it survives a reload — a
 * phone discarding a backgrounded page is common, and the player should land
 * back in their race rather than on an empty setup screen.
 */
function readSeat(): StoredSeat | null {
  try {
    const seat = JSON.parse(sessionStorage.getItem(SEAT_STORAGE) ?? 'null')
    return typeof seat?.code === 'string' && typeof seat?.key === 'string' ? seat : null
  } catch {
    return null
  }
}

function writeSeat(seat: StoredSeat | null) {
  try {
    if (seat) sessionStorage.setItem(SEAT_STORAGE, JSON.stringify(seat))
    else sessionStorage.removeItem(SEAT_STORAGE)
  } catch {
    // Storage refused (private mode, quota). Reclaiming after a reload just will not happen.
  }
}

/** randomUUID needs a secure context; a phone on the LAN over plain http is not one. */
function makeKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

/**
 * Connection and room state for a race.
 *
 * The socket opens when this hook mounts and closes when it unmounts, so it
 * only ever exists on the race page. An open connection keeps the Railway
 * container awake and Railway bills by usage — a socket held open across the
 * whole site would quietly burn credit around the clock.
 *
 * Every reconnect arrives under a new socket id, which the server has never
 * seen. The seat key is what ties the returning connection to its seat.
 */
export function useRace() {
  const socketRef = useRef<Socket | null>(null)
  const offsetRef = useRef(0)
  const roomRef = useRef<Room | null>(null)
  // Read once: a seat left behind by a reload, to reclaim on the first connect.
  const leftoverRef = useRef<StoredSeat | null>(readSeat())
  const keyRef = useRef<string>(leftoverRef.current?.key ?? makeKey())

  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [you, setYou] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    roomRef.current = room
  }, [room])

  useEffect(() => {
    const socket = io(socketOrigin(), {
      path: '/race-socket',
      transports: ['websocket', 'polling'],
      // The defaults give an attempt 20 seconds and wait up to 5 between
      // attempts. An attempt that starts while the signal is gone stalls for
      // all of that after the signal returns — measured as a 20-second wait
      // to get back into a one-minute race. Eight seconds still leaves a slow
      // mobile handshake room to finish.
      timeout: 8_000,
      reconnectionDelayMax: 2_000,
    })
    socketRef.current = socket

    // A phone says when it is back: online again, or this page shown again.
    // Don't wait for a stalled attempt or a dead connection to time out. A
    // socket that is not connected starts over now. One that says it is
    // connected has to prove it, because a page that was suspended or changed
    // networks can be holding a connection that no longer goes anywhere.
    const reconnectNow = () => {
      socket.disconnect().connect()
    }
    const checkConnection = () => {
      if (document.visibilityState === 'hidden') return
      if (!socket.connected) {
        reconnectNow()
        return
      }
      const id = socket.id
      socket.timeout(4_000).emit('race:sync', {}, (err: Error | null) => {
        // A dropped connection fails this at once, and its reconnect is already under way.
        if (err && socket.id === id) reconnectNow()
      })
    }
    window.addEventListener('online', checkConnection)
    document.addEventListener('visibilitychange', checkConnection)

    socket.on('connect', () => {
      setConnected(true)
      setError(null)

      // Halve the round trip to estimate how far this browser's clock sits
      // from the server's.
      const sentAt = Date.now()
      socket.emit('race:sync', {}, (reply: { serverNow: number }) => {
        const rtt = Date.now() - sentAt
        offsetRef.current = reply.serverNow + rtt / 2 - Date.now()
      })

      const live = roomRef.current
      const leftover = leftoverRef.current
      leftoverRef.current = null
      const code = live?.code ?? leftover?.code
      if (!code) return

      socket.emit(
        'race:resume',
        { code, key: keyRef.current },
        (reply: { ok: boolean; room?: Room; you?: string }) => {
          if (reply?.ok && reply.room && reply.you) {
            setRoom(reply.room)
            setYou(reply.you)
            writeSeat({ code, key: keyRef.current })
            return
          }

          writeSeat(null)
          // A seat left over from a reload that has since closed is not worth
          // mentioning. Losing the race you are looking at is.
          if (live) {
            setRoom(null)
            setYou(null)
            setError('The connection dropped for too long and the room has closed.')
          }
        }
      )
    })

    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => {
      setConnected(false)
      setError('Could not reach the race server. It may be waking up — try again in a moment.')
    })

    socket.on('race:state', (next: Room) => setRoom(next))

    socket.on('race:opponent', (tick: { id: string; progress: number; wpm: number; accuracy: number }) => {
      setRoom((current) => {
        if (!current || !current.players[tick.id]) return current
        return {
          ...current,
          players: {
            ...current.players,
            [tick.id]: { ...current.players[tick.id], ...tick },
          },
        }
      })
    })

    return () => {
      window.removeEventListener('online', checkConnection)
      document.removeEventListener('visibilitychange', checkConnection)
      socket.emit('race:leave')
      writeSeat(null)
      socket.close()
      socketRef.current = null
    }
  }, [])

  /** Server epoch time, corrected for this browser's drift. */
  const serverNow = useCallback(() => Date.now() + offsetRef.current, [])

  const createRoom = useCallback(
    (name: string, difficulty: Difficulty, timer: TimerOption) =>
      new Promise<Room | null>((resolve) => {
        socketRef.current?.emit(
          'race:create',
          { name, difficulty, timer, key: keyRef.current },
          (reply: { ok: boolean; room: Room; you: string }) => {
            if (reply?.ok) {
              setRoom(reply.room)
              setYou(reply.you)
              writeSeat({ code: reply.room.code, key: keyRef.current })
              resolve(reply.room)
            } else resolve(null)
          }
        )
      }),
    []
  )

  const joinRoom = useCallback(
    (code: string, name: string) =>
      new Promise<JoinFailure | null>((resolve) => {
        socketRef.current?.emit(
          'race:join',
          { code, name, key: keyRef.current },
          (reply: { ok: boolean; room?: Room; you?: string; reason?: JoinFailure }) => {
            if (reply?.ok && reply.room && reply.you) {
              setRoom(reply.room)
              setYou(reply.you)
              writeSeat({ code: reply.room.code, key: keyRef.current })
              resolve(null)
            } else resolve(reply?.reason ?? 'not-found')
          }
        )
      }),
    []
  )

  const sendProgress = useCallback(
    (code: string, progress: number, wpm: number, accuracy: number) => {
      // Volatile: a tick that could not go out is stale by the time the
      // connection returns, and a queued backlog would only replay old positions.
      socketRef.current?.volatile.emit('race:progress', { code, progress, wpm, accuracy })
    },
    []
  )

  const sendFinish = useCallback((code: string, wpm: number, accuracy: number) => {
    socketRef.current?.emit('race:finish', { code, wpm, accuracy })
  }, [])

  /** Same room, same players, fresh text. This returns the room to the ready
   *  gate rather than starting a countdown, so a rematch begins the same way
   *  a first race does. */
  const requestRematch = useCallback(
    (code: string) =>
      new Promise<string | null>((resolve) => {
        socketRef.current?.emit('race:rematch', { code }, (reply: { ok: boolean; reason?: string }) => {
          resolve(reply?.ok ? null : (reply?.reason ?? 'failed'))
        })
      }),
    []
  )

  /**
   * Arming yourself, not starting the race. The server runs the clock only
   * once both seats have said yes.
   */
  const sendReady = useCallback((code: string, ready: boolean) => {
    socketRef.current?.emit('race:ready', { code, ready })
  }, [])

  /**
   * Where a code leads, without taking a seat. The joiner is asked for a name
   * only once the code is known to be good, and sees who they are about to race.
   */
  const peekRoom = useCallback(
    (code: string) =>
      new Promise<RoomPreview | JoinFailure>((resolve) => {
        socketRef.current?.emit(
          'race:peek',
          { code },
          (reply: {
            ok: boolean
            opponent?: string
            difficulty?: Difficulty
            timer?: TimerOption
            reason?: JoinFailure
          }) => {
            if (reply?.ok && reply.opponent && reply.difficulty && reply.timer) {
              resolve({ code, opponent: reply.opponent, difficulty: reply.difficulty, timer: reply.timer })
            } else resolve(reply?.reason ?? 'not-found')
          }
        )
      }),
    []
  )

  const leave = useCallback(() => {
    socketRef.current?.emit('race:leave')
    writeSeat(null)
    setRoom(null)
    setYou(null)
  }, [])

  return {
    connected,
    room,
    you,
    error,
    serverNow,
    createRoom,
    peekRoom,
    joinRoom,
    sendProgress,
    sendFinish,
    sendReady,
    requestRematch,
    leave,
  }
}

export default useRace
