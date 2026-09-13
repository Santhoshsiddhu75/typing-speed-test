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

/** The API base without the /api suffix — the socket lives at the root. */
function socketOrigin(): string {
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    (window.location.hostname === 'localhost'
      ? 'http://localhost:3003/api'
      : 'https://web-production-abb30.up.railway.app/api')

  return base.replace(/\/api\/?$/, '')
}

/**
 * Connection and room state for a race.
 *
 * The socket opens when this hook mounts and closes when it unmounts, so it
 * only ever exists on the race page. An open connection keeps the Railway
 * container awake and Railway bills by usage — a socket held open across the
 * whole site would quietly burn credit around the clock.
 */
export function useRace() {
  const socketRef = useRef<Socket | null>(null)
  const offsetRef = useRef(0)

  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [you, setYou] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const socket = io(socketOrigin(), {
      path: '/race-socket',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

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
      socket.emit('race:leave')
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
          { name, difficulty, timer },
          (reply: { ok: boolean; room: Room; you: string }) => {
            if (reply?.ok) {
              setRoom(reply.room)
              setYou(reply.you)
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
          { code, name },
          (reply: { ok: boolean; room?: Room; you?: string; reason?: JoinFailure }) => {
            if (reply?.ok && reply.room && reply.you) {
              setRoom(reply.room)
              setYou(reply.you)
              resolve(null)
            } else resolve(reply?.reason ?? 'not-found')
          }
        )
      }),
    []
  )

  const sendProgress = useCallback(
    (code: string, progress: number, wpm: number, accuracy: number) => {
      socketRef.current?.emit('race:progress', { code, progress, wpm, accuracy })
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

  const leave = useCallback(() => {
    socketRef.current?.emit('race:leave')
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
    joinRoom,
    sendProgress,
    sendFinish,
    sendReady,
    requestRematch,
    leave,
  }
}

export default useRace
