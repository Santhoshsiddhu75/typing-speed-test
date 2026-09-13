/**
 * Race rooms, held in memory.
 *
 * Deliberately not in the database. A room is worth nothing once the race is
 * over, nobody needs to read one back later, and keeping them out of SQLite
 * means no migrations and no cleanup job — a restart simply drops them, which
 * is the correct outcome anyway.
 */

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Timer = 1 | 2 | 5

export type RoomStatus = 'waiting' | 'countdown' | 'racing' | 'finished'

export interface Player {
  id: string
  name: string
  /** 0-1, how far through the text they are. */
  progress: number
  wpm: number
  accuracy: number
  finished: boolean
  connected: boolean
}

export interface Room {
  code: string
  hostId: string
  difficulty: Difficulty
  timer: Timer
  /**
   * Both clients build the same text from this with the same passage library,
   * so a race never has to send a thousand words over the wire.
   */
  seed: number
  status: RoomStatus
  players: Record<string, Player>
  /** Server clock, in epoch ms. Clients correct for their own drift. */
  startAt: number | null
  endAt: number | null
  createdAt: number
}

const rooms = new Map<string, Room>()

/** Rooms nobody has touched in an hour are abandoned, not in progress. */
const ROOM_TTL_MS = 60 * 60 * 1000
const COUNTDOWN_MS = 3500

/** Digits only: this gets read aloud and typed on a phone. */
function makeCode(): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    if (!rooms.has(code)) return code
  }
  // Every candidate collided, which needs a far busier site than this one.
  return String(Date.now()).slice(-6)
}

export function createRoom(
  hostId: string,
  name: string,
  difficulty: Difficulty,
  timer: Timer
): Room {
  const room: Room = {
    code: makeCode(),
    hostId,
    difficulty,
    timer,
    seed: Math.floor(Math.random() * 2 ** 31),
    status: 'waiting',
    players: {
      [hostId]: { id: hostId, name, progress: 0, wpm: 0, accuracy: 100, finished: false, connected: true },
    },
    startAt: null,
    endAt: null,
    createdAt: Date.now(),
  }

  rooms.set(room.code, room)
  return room
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code)
}

export type JoinResult =
  | { ok: true; room: Room }
  | { ok: false; reason: 'not-found' | 'full' | 'in-progress' }

export function joinRoom(code: string, playerId: string, name: string): JoinResult {
  const room = rooms.get(code)
  if (!room) return { ok: false, reason: 'not-found' }
  if (room.status !== 'waiting') return { ok: false, reason: 'in-progress' }
  if (Object.keys(room.players).length >= 2) return { ok: false, reason: 'full' }

  room.players[playerId] = {
    id: playerId,
    name,
    progress: 0,
    wpm: 0,
    accuracy: 100,
    finished: false,
    connected: true,
  }

  return { ok: true, room }
}

/**
 * Both seats filled, so lock the room and put a start time on the clock.
 * The countdown is a server timestamp rather than a duration: a client that
 * takes 400ms to receive it still starts at the same instant as the other.
 */
export function beginCountdown(room: Room): Room {
  room.status = 'countdown'
  room.startAt = Date.now() + COUNTDOWN_MS
  room.endAt = room.startAt + room.timer * 60_000
  return room
}

export function markRacing(room: Room): Room {
  if (room.status === 'countdown') room.status = 'racing'
  return room
}

export function updateProgress(
  room: Room,
  playerId: string,
  progress: number,
  wpm: number,
  accuracy: number
): void {
  const player = room.players[playerId]
  if (!player || player.finished) return

  player.progress = Math.max(0, Math.min(1, progress))
  player.wpm = Math.max(0, Math.round(wpm))
  player.accuracy = Math.max(0, Math.min(100, Math.round(accuracy)))
}

export function finishPlayer(
  room: Room,
  playerId: string,
  wpm: number,
  accuracy: number
): Room {
  const player = room.players[playerId]
  if (player) {
    player.finished = true
    player.progress = 1
    player.wpm = Math.max(0, Math.round(wpm))
    player.accuracy = Math.max(0, Math.min(100, Math.round(accuracy)))
  }

  const everyone = Object.values(room.players)
  if (everyone.length > 0 && everyone.every((p) => p.finished || !p.connected)) {
    room.status = 'finished'
  }

  return room
}

/**
 * A player leaving is not the same as a player disconnecting mid-race: before
 * the start we free the seat so someone else can take it, but once racing we
 * keep them in place so the other player still sees who they were racing.
 */
export function removePlayer(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (!room.players[playerId]) continue

    if (room.status === 'waiting' || room.status === 'finished') {
      delete room.players[playerId]
    } else {
      room.players[playerId].connected = false
      const live = Object.values(room.players).filter((p) => p.connected && !p.finished)
      if (live.length === 0) room.status = 'finished'
    }

    if (Object.keys(room.players).length === 0) {
      rooms.delete(room.code)
      return undefined
    }

    return room
  }

  return undefined
}

/** Called on a timer; keeps abandoned rooms from accumulating in memory. */
export function sweepStaleRooms(now = Date.now()): number {
  let removed = 0
  for (const [code, room] of rooms) {
    const idle = now - room.createdAt > ROOM_TTL_MS
    const empty = Object.values(room.players).every((p) => !p.connected)
    if (idle || empty) {
      rooms.delete(code)
      removed += 1
    }
  }
  return removed
}

export function roomCount(): number {
  return rooms.size
}
