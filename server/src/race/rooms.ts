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
  /** Armed for the next race. Both seats must say yes before a countdown. */
  ready: boolean
  /**
   * In the lobby for the next race. False for a player still on the result
   * after the other one has pressed Rematch.
   */
  inLobby: boolean
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

/**
 * Seat keys never leave the server. A key is what lets a player take their
 * seat back after a dropped connection, so it cannot ride along in the room
 * state both players receive — the opponent would be able to claim it.
 */
const seatKeys = new Map<string, string>()
/** When a seat's connection dropped, for seats that may yet be reclaimed. */
const droppedAt = new Map<string, number>()
/** Last activity per room. Idleness is measured from here, not from creation. */
const lastActive = new Map<string, number>()

/** Rooms nobody has touched in an hour are abandoned, not in progress. */
const ROOM_TTL_MS = 60 * 60 * 1000
const COUNTDOWN_MS = 3500

/**
 * How long a dropped seat is held before it is given up. Long enough to leave
 * the page and send the room code from another app — which is exactly when a
 * phone suspends the browser and the connection goes with it.
 */
export const SEAT_GRACE_MS = 2 * 60 * 1000

/** Digits only: this gets read aloud and typed on a phone. */
function makeCode(): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    if (!rooms.has(code)) return code
  }
  // Every candidate collided, which needs a far busier site than this one.
  return String(Date.now()).slice(-6)
}

function newPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    progress: 0,
    wpm: 0,
    accuracy: 100,
    finished: false,
    connected: true,
    ready: false,
    inLobby: true,
  }
}

function touch(room: Room) {
  lastActive.set(room.code, Date.now())
}

function forgetSeat(playerId: string) {
  seatKeys.delete(playerId)
  droppedAt.delete(playerId)
}

function deleteRoom(room: Room) {
  for (const id of Object.keys(room.players)) forgetSeat(id)
  lastActive.delete(room.code)
  rooms.delete(room.code)
}

export function createRoom(
  hostId: string,
  name: string,
  difficulty: Difficulty,
  timer: Timer,
  key = ''
): Room {
  const room: Room = {
    code: makeCode(),
    hostId,
    difficulty,
    timer,
    seed: Math.floor(Math.random() * 2 ** 31),
    status: 'waiting',
    players: { [hostId]: newPlayer(hostId, name) },
    startAt: null,
    endAt: null,
    createdAt: Date.now(),
  }

  rooms.set(room.code, room)
  if (key) seatKeys.set(hostId, key)
  touch(room)
  return room
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code)
}

export type JoinResult =
  | { ok: true; room: Room }
  | { ok: false; reason: 'not-found' | 'full' | 'in-progress' }

export function joinRoom(code: string, playerId: string, name: string, key = ''): JoinResult {
  const room = rooms.get(code)
  if (!room) return { ok: false, reason: 'not-found' }
  // Already seated here: joining again changes nothing.
  if (room.players[playerId]) return { ok: true, room }
  if (room.status !== 'waiting') return { ok: false, reason: 'in-progress' }
  // A dropped seat is still held for its player, so it still counts.
  if (Object.keys(room.players).length >= 2) return { ok: false, reason: 'full' }

  room.players[playerId] = newPlayer(playerId, name)
  if (key) seatKeys.set(playerId, key)
  touch(room)
  return { ok: true, room }
}

export type PeekResult =
  | { ok: true; opponent: string; difficulty: Difficulty; timer: Timer }
  | { ok: false; reason: 'not-found' | 'full' | 'in-progress' }

/**
 * Where a code leads, without taking a seat: who is waiting and what they
 * chose, or why joining would fail. A joiner sees this before being asked for
 * a name, so a mistyped code fails before they have typed anything else.
 */
export function peekRoom(code: string): PeekResult {
  const room = rooms.get(code)
  if (!room) return { ok: false, reason: 'not-found' }
  if (room.status !== 'waiting') return { ok: false, reason: 'in-progress' }
  const seated = Object.values(room.players)
  if (seated.length >= 2) return { ok: false, reason: 'full' }
  // Whoever is seated, rather than hostId: a host can leave the gate and the
  // guest stays behind, waiting for someone new.
  return { ok: true, opponent: seated[0]?.name ?? 'Player', difficulty: room.difficulty, timer: room.timer }
}

/**
 * Arming, not starting. Filling the second seat used to drop both players
 * straight into a countdown they were not looking at; now each says yes and
 * the race begins only when both have.
 *
 * Returns true when that press was the one that completed the pair.
 */
export function setReady(room: Room, playerId: string, ready: boolean): boolean {
  const player = room.players[playerId]
  // Someone still on the result screen has not come back for this race yet.
  if (!player || room.status !== 'waiting' || !player.inLobby) return false

  player.ready = ready
  touch(room)

  const everyone = Object.values(room.players)
  return everyone.length === 2 && everyone.every((p) => p.ready && p.connected)
}

/**
 * Both seats armed, so lock the room and put a start time on the clock.
 * The countdown is a server timestamp rather than a duration: a client that
 * takes 400ms to receive it still starts at the same instant as the other.
 */
export function beginCountdown(room: Room): Room {
  room.status = 'countdown'
  room.startAt = Date.now() + COUNTDOWN_MS
  room.endAt = room.startAt + room.timer * 60_000
  touch(room)
  return room
}

export function markRacing(room: Room): Room {
  if (room.status === 'countdown') room.status = 'racing'
  return room
}

/**
 * The server's own deadline. Clients stop themselves when their clock runs out
 * and report, but a frozen or heavily throttled tab never does, and the other
 * player must not wait on a result that is never coming. Whatever each player
 * last reported stands. Someone who disconnected stays unfinished, so the
 * result can still say they left.
 */
export function endRace(room: Room): Room {
  if (room.status !== 'racing') return room
  for (const player of Object.values(room.players)) {
    if (player.connected) player.finished = true
  }
  room.status = 'finished'
  touch(room)
  return room
}

export type RematchResult =
  | { ok: true; room: Room }
  | {
      ok: false
      reason: 'not-found' | 'not-in-room' | 'not-finished' | 'opponent-left' | 'already-starting'
    }

/**
 * Run it back without re-sharing the code. Same room, same players, fresh seed
 * so the text differs — a rematch on identical text would be a memory test.
 *
 * The first press resets the room to the ready gate and takes only that player
 * back to the lobby. The other stays on the result screen, told the first is
 * ready to go again, until they press Rematch too. Moving both screens at once
 * pulled the result away from someone who was still reading it.
 *
 * Nothing starts until both are back and both are ready: the same rule that
 * begins a first race begins a rematch. Only someone seated in the room can ask.
 */
export function requestRematch(code: string, playerId: string): RematchResult {
  const room = rooms.get(code)
  if (!room) return { ok: false, reason: 'not-found' }
  const player = room.players[playerId]
  if (!player) return { ok: false, reason: 'not-in-room' }
  if (room.status === 'countdown' || room.status === 'racing') {
    return { ok: false, reason: 'already-starting' }
  }

  const present = Object.values(room.players).filter((p) => p.connected)

  // The other player already reset the room: this one follows them back.
  if (room.status === 'waiting') {
    if (player.inLobby) return { ok: false, reason: 'not-finished' }
    if (present.length < 2) return { ok: false, reason: 'opponent-left' }
    player.inLobby = true
    touch(room)
    return { ok: true, room }
  }

  if (present.length < 2) return { ok: false, reason: 'opponent-left' }

  room.seed = Math.floor(Math.random() * 2 ** 31)
  room.status = 'waiting'
  room.startAt = null
  room.endAt = null

  for (const seat of Object.values(room.players)) {
    seat.progress = 0
    seat.wpm = 0
    seat.accuracy = 100
    seat.finished = false
    seat.ready = false
    seat.inLobby = seat.id === playerId
  }

  touch(room)
  return { ok: true, room }
}

/** Only while a race is running: anything earlier or later is stale. */
export function updateProgress(
  room: Room,
  playerId: string,
  progress: number,
  wpm: number,
  accuracy: number
): void {
  if (room.status !== 'racing') return
  const player = room.players[playerId]
  if (!player || player.finished) return

  player.progress = Math.max(0, Math.min(1, progress))
  player.wpm = Math.max(0, Math.round(wpm))
  player.accuracy = Math.max(0, Math.min(100, Math.round(accuracy)))
  touch(room)
}

/**
 * A player reports their final numbers. Their position is left where they
 * actually got to: the opponent's marker is drawn from it, and snapping it to
 * the end would throw that marker to the last word for whoever is still
 * racing in the instant before their own clock stops.
 *
 * Ignored unless a race is running — a finish at the ready gate must not end
 * a race that never started.
 */
export function finishPlayer(
  room: Room,
  playerId: string,
  wpm: number,
  accuracy: number
): Room {
  if (room.status !== 'racing') return room
  const player = room.players[playerId]
  if (!player) return room

  player.finished = true
  player.wpm = Math.max(0, Math.round(wpm))
  player.accuracy = Math.max(0, Math.min(100, Math.round(accuracy)))

  if (Object.values(room.players).every((p) => p.finished || !p.connected)) {
    room.status = 'finished'
  }

  touch(room)
  return room
}

export type Departure = 'left' | 'dropped'

export interface RemoveResult {
  code: string
  /** Null when that departure emptied the room and it was deleted. */
  room: Room | null
}

/**
 * Take a player out of the room they are seated in.
 *
 * 'left' is a decision. At the gate or on the result screen the seat is freed
 * at once, so someone else can take it, and nothing is held.
 *
 * 'dropped' is a lost connection, which on a phone usually means the page was
 * suspended rather than that the player went anywhere. The seat is held and
 * marked disconnected, so the same player can reclaim it with their key.
 *
 * Once a race is running the seat stays either way: the other player still
 * sees who they were racing, and the result still has both scores.
 *
 * `exceptCode` spares one room — used when a player joins a new room and
 * their old seat has to go without touching the new one.
 */
export function removePlayer(
  playerId: string,
  how: Departure = 'left',
  exceptCode?: string
): RemoveResult | undefined {
  for (const room of rooms.values()) {
    if (room.code === exceptCode) continue
    const player = room.players[playerId]
    // A seat already let go is not the one this player is in now.
    if (!player || !player.connected) continue

    const running = room.status === 'countdown' || room.status === 'racing'

    if (how === 'left' && !running) {
      delete room.players[playerId]
      forgetSeat(playerId)
      // Whoever is left has nothing to be ready for any more.
      for (const other of Object.values(room.players)) other.ready = false
    } else {
      player.connected = false
      player.ready = false
      if (how === 'dropped') droppedAt.set(playerId, Date.now())
      else forgetSeat(playerId)

      // Everyone chose to leave, so there is no race left to run. A dropped
      // connection does not count: that player may be back, and the server
      // deadline ends the race if they are not.
      if (
        running &&
        how === 'left' &&
        Object.values(room.players).every((p) => !p.connected || p.finished)
      ) {
        room.status = 'finished'
      }
    }

    if (Object.keys(room.players).length === 0) {
      deleteRoom(room)
      return { code: room.code, room: null }
    }

    touch(room)
    return { code: room.code, room }
  }

  return undefined
}

export type ResumeResult =
  | { ok: true; room: Room; previousId: string }
  | { ok: false; reason: 'not-found' | 'no-seat' }

/**
 * Put a returning player back in their seat under their new connection. The
 * seat key is the proof; the socket id the seat was held under is not, since
 * every reconnect is issued a new one.
 */
export function resumeSeat(code: string, key: string, newId: string): ResumeResult {
  const room = rooms.get(code)
  if (!room) return { ok: false, reason: 'not-found' }
  if (!key) return { ok: false, reason: 'no-seat' }

  const previousId = Object.keys(room.players).find((id) => seatKeys.get(id) === key)
  if (!previousId) return { ok: false, reason: 'no-seat' }

  if (previousId !== newId) {
    // Rebuilt rather than deleted and re-added, so the host stays first.
    const players: Record<string, Player> = {}
    for (const [id, player] of Object.entries(room.players)) {
      if (id === previousId) players[newId] = { ...player, id: newId }
      else players[id] = player
    }
    room.players = players
    if (room.hostId === previousId) room.hostId = newId
    forgetSeat(previousId)
    seatKeys.set(newId, key)
  }

  room.players[newId].connected = true
  droppedAt.delete(newId)
  touch(room)
  return { ok: true, room, previousId }
}

/**
 * Give up a held seat whose player never came back. Only at the gate or on
 * the result screen: during a race the seat stays, so the result keeps both
 * names. Returns undefined when there was nothing to expire — including when
 * the player has since reclaimed the seat under a new id.
 */
export function expireDroppedSeat(playerId: string, now = Date.now()): RemoveResult | undefined {
  const since = droppedAt.get(playerId)
  if (since === undefined || now - since < SEAT_GRACE_MS) return undefined

  for (const room of rooms.values()) {
    const player = room.players[playerId]
    if (!player || player.connected) continue
    if (room.status === 'countdown' || room.status === 'racing') return undefined

    delete room.players[playerId]
    forgetSeat(playerId)
    if (Object.keys(room.players).length === 0) {
      deleteRoom(room)
      return { code: room.code, room: null }
    }
    return { code: room.code, room }
  }

  forgetSeat(playerId)
  return undefined
}

/**
 * Called on a timer; keeps abandoned rooms from accumulating in memory.
 *
 * A room is abandoned when nobody has touched it for an hour, or when every
 * seat is empty and none is still inside its grace period. Idleness runs from
 * the last activity — two friends rematching for over an hour are using the
 * room, not abandoning it.
 */
export function sweepStaleRooms(now = Date.now()): number {
  let removed = 0
  for (const room of rooms.values()) {
    const idle = now - (lastActive.get(room.code) ?? room.createdAt) > ROOM_TTL_MS
    const abandoned = Object.values(room.players).every((player) => {
      if (player.connected) return false
      const since = droppedAt.get(player.id)
      return since === undefined || now - since >= SEAT_GRACE_MS
    })
    if (idle || abandoned) {
      deleteRoom(room)
      removed += 1
    }
  }
  return removed
}

export function roomCount(): number {
  return rooms.size
}
