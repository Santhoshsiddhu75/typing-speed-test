/**
 * The race server, driven over its real socket protocol with no browser.
 *
 *   npm run test:race -- protocol
 *
 * These pin down what the server guarantees regardless of which client is on
 * the other end — including clients that are stale, throttled, disconnected
 * or hostile, which the browser tests cannot produce on demand.
 *
 * Point RACE_SERVER_URL at another server (a compiled production build, say)
 * to run the same guarantees against it.
 */
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { io, type Socket } from 'socket.io-client'

const SERVER = process.env.RACE_SERVER_URL ?? 'http://localhost:3003'

interface Player {
  id: string
  name: string
  progress: number
  wpm: number
  accuracy: number
  finished: boolean
  connected: boolean
  ready: boolean
  inLobby: boolean
}
interface Room {
  code: string
  status: 'waiting' | 'countdown' | 'racing' | 'finished'
  difficulty: string
  timer: number
  seed: number
  startAt: number | null
  endAt: number | null
  players: Record<string, Player>
}
interface Seated {
  host: Socket
  guest: Socket
  code: string
  hostKey: string
  guestKey: string
}

const sockets: Socket[] = []

async function connect(): Promise<Socket> {
  const socket = io(SERVER, {
    path: '/race-socket',
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  })
  sockets.push(socket)
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve())
    socket.once('connect_error', reject)
  })
  return socket
}

test.afterEach(() => {
  for (const socket of sockets.splice(0)) socket.disconnect()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function call<T = any>(socket: Socket, event: string, payload: unknown = {}): Promise<T> {
  return new Promise((resolve) => socket.emit(event, payload, (reply: T) => resolve(reply)))
}

/** The next race:state on this socket that satisfies `match`. Attach before triggering. */
function stateWhere(socket: Socket, match: (room: Room) => boolean, ms = 8000): Promise<Room> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('race:state', listen)
      reject(new Error(`no matching race:state within ${ms}ms`))
    }, ms)
    const listen = (room: Room) => {
      if (!match(room)) return
      clearTimeout(timer)
      socket.off('race:state', listen)
      resolve(room)
    }
    socket.on('race:state', listen)
  })
}

/** Resolves if no race:state satisfying `match` arrives within `ms`. */
function noStateWhere(socket: Socket, match: (room: Room) => boolean, ms = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const listen = (room: Room) => {
      if (!match(room)) return
      clearTimeout(timer)
      socket.off('race:state', listen)
      reject(new Error(`unexpected race:state (status ${room.status})`))
    }
    const timer = setTimeout(() => {
      socket.off('race:state', listen)
      resolve()
    }, ms)
    socket.on('race:state', listen)
  })
}

/** Every event of this name seen within `ms`. */
function collect<T>(socket: Socket, event: string, ms: number): Promise<T[]> {
  return new Promise((resolve) => {
    const seen: T[] = []
    const listen = (payload: T) => seen.push(payload)
    socket.on(event, listen)
    setTimeout(() => {
      socket.off(event, listen)
      resolve(seen)
    }, ms)
  })
}

async function seated(): Promise<Seated> {
  const host = await connect()
  const guest = await connect()
  const hostKey = randomUUID()
  const guestKey = randomUUID()
  const created = await call<{ ok: boolean; room: Room }>(host, 'race:create', {
    name: 'Ada',
    difficulty: 'medium',
    timer: 1,
    key: hostKey,
  })
  const joined = await call<{ ok: boolean }>(guest, 'race:join', {
    code: created.room.code,
    name: 'Grace',
    key: guestKey,
  })
  expect(joined.ok).toBe(true)
  return { host, guest, code: created.room.code, hostKey, guestKey }
}

async function racing(): Promise<Seated & { room: Room }> {
  const pair = await seated()
  const started = stateWhere(pair.host, (r) => r.status === 'racing', 8000)
  await call(pair.host, 'race:ready', { code: pair.code, ready: true })
  await call(pair.guest, 'race:ready', { code: pair.code, ready: true })
  return { ...pair, room: await started }
}

async function finished(): Promise<Seated> {
  const pair = await racing()
  const done = stateWhere(pair.host, (r) => r.status === 'finished')
  pair.host.emit('race:finish', { code: pair.code, wpm: 80, accuracy: 96 })
  pair.guest.emit('race:finish', { code: pair.code, wpm: 55, accuracy: 92 })
  await done
  return pair
}

// ---------------------------------------------------------------------------

test.describe('connection', () => {
  test('clock sync answers with the server time', async () => {
    const reply = await call<{ serverNow: number }>(await connect(), 'race:sync')
    expect(Math.abs(reply.serverNow - Date.now())).toBeLessThan(2000)
  })
})

test.describe('creating and joining', () => {
  test('a new room is waiting, six digits, with the host seated and unready', async () => {
    const host = await connect()
    const reply = await call<{ ok: boolean; room: Room; you: string }>(host, 'race:create', {
      name: 'Ada',
      difficulty: 'hard',
      timer: 5,
    })
    expect(reply.ok).toBe(true)
    expect(reply.you).toBe(host.id)
    expect(reply.room.code).toMatch(/^\d{6}$/)
    expect(reply.room.status).toBe('waiting')
    expect(reply.room.difficulty).toBe('hard')
    expect(reply.room.timer).toBe(5)
    expect(reply.room.players[host.id!]).toMatchObject({ name: 'Ada', ready: false, connected: true })
  })

  test('names are trimmed and capped at 8 on the server, and blank becomes Player', async () => {
    const long = await call<{ room: Room; you: string }>(await connect(), 'race:create', { name: '  Bartholomew  ' })
    expect(long.room.players[long.you].name).toBe('Bartholo')
    const blank = await call<{ room: Room; you: string }>(await connect(), 'race:create', { name: '   ' })
    expect(blank.room.players[blank.you].name).toBe('Player')
    const junk = await call<{ room: Room; you: string }>(await connect(), 'race:create', { name: 42 })
    expect(junk.room.players[junk.you].name).toBe('Player')
  })

  test('unknown difficulty and length fall back to the defaults', async () => {
    const reply = await call<{ room: Room }>(await connect(), 'race:create', { difficulty: 'insane', timer: 99 })
    expect(reply.room.difficulty).toBe('medium')
    expect(reply.room.timer).toBe(1)
  })

  test('a seat key never appears in the state either player receives', async () => {
    const { host, guest, hostKey, guestKey, code } = await seated()
    const seen = stateWhere(host, () => true)
    await call(guest, 'race:ready', { code, ready: true })
    const text = JSON.stringify(await seen)
    expect(text).not.toContain(hostKey)
    expect(text).not.toContain(guestKey)
  })

  test('joining a code that does not exist is refused', async () => {
    expect(await call(await connect(), 'race:join', { code: '000001', name: 'x' })).toEqual({
      ok: false,
      reason: 'not-found',
    })
  })

  test('checking a code shows who is waiting and what they chose, and takes no seat', async () => {
    const host = await connect()
    const created = await call<{ room: Room }>(host, 'race:create', { name: 'Ada', difficulty: 'hard', timer: 2 })
    const code = created.room.code
    const expected = { ok: true, opponent: 'Ada', difficulty: 'hard', timer: 2 }

    const visitor = await connect()
    expect(await call(visitor, 'race:peek', { code })).toEqual(expected)
    // Had the check taken a seat, the room would now read as full to anyone else.
    expect(await call(await connect(), 'race:peek', { code })).toEqual(expected)
    expect((await call(visitor, 'race:join', { code, name: 'Grace' })).ok).toBe(true)
  })

  test('checking a code says why joining would fail', async () => {
    expect(await call(await connect(), 'race:peek', { code: '000003' })).toEqual({ ok: false, reason: 'not-found' })
    const { code } = await seated()
    expect(await call(await connect(), 'race:peek', { code })).toEqual({ ok: false, reason: 'full' })
    const running = await racing()
    expect(await call(await connect(), 'race:peek', { code: running.code })).toEqual({
      ok: false,
      reason: 'in-progress',
    })
  })

  test('the host hears about the second player', async () => {
    const host = await connect()
    const guest = await connect()
    const created = await call<{ room: Room }>(host, 'race:create', { name: 'Ada' })
    const seen = stateWhere(host, (r) => Object.keys(r.players).length === 2)
    await call(guest, 'race:join', { code: created.room.code, name: 'Grace' })
    expect((await seen).players[guest.id!]).toMatchObject({ name: 'Grace', ready: false })
  })

  test('a third player is turned away', async () => {
    const { code } = await seated()
    expect(await call(await connect(), 'race:join', { code, name: 'x' })).toEqual({ ok: false, reason: 'full' })
  })

  test('nobody can join once the race is under way', async () => {
    const { code, guest } = await racing()
    guest.disconnect()
    expect(await call(await connect(), 'race:join', { code, name: 'x' })).toEqual({
      ok: false,
      reason: 'in-progress',
    })
  })

  test('a socket that opens a second room leaves its first', async () => {
    const { host, guest, code } = await seated()
    const hostLeft = stateWhere(guest, (r) => r.code === code && !r.players[host.id!])
    const second = await call<{ room: Room }>(host, 'race:create', { name: 'Ada' })
    expect(second.room.code).not.toBe(code)
    await hostLeft
  })

  test('a socket that joins another room leaves the one it was in', async () => {
    const { host, guest, code } = await seated()
    const other = await call<{ room: Room }>(await connect(), 'race:create', { name: 'Linus' })
    const guestLeft = stateWhere(host, (r) => r.code === code && !r.players[guest.id!])
    expect((await call(guest, 'race:join', { code: other.room.code, name: 'Grace' })).ok).toBe(true)
    await guestLeft
  })

  test('a join that fails leaves the player in the room they already had', async () => {
    const { host, guest, code } = await seated()
    const quiet = noStateWhere(host, (r) => !r.players[guest.id!], 1000)
    expect((await call(guest, 'race:join', { code: '000002', name: 'Grace' })).ok).toBe(false)
    await quiet
  })
})

test.describe('the ready gate', () => {
  test('filling the second seat starts nothing', async () => {
    const host = await connect()
    const guest = await connect()
    const created = await call<{ room: Room }>(host, 'race:create', { name: 'Ada' })
    const quiet = noStateWhere(host, (r) => r.status !== 'waiting', 1500)
    await call(guest, 'race:join', { code: created.room.code, name: 'Grace' })
    await quiet
  })

  test('one player ready starts nothing, and both see who is ready', async () => {
    const { host, guest, code } = await seated()
    const guestSees = stateWhere(guest, (r) => r.players[host.id!]?.ready === true)
    const quiet = noStateWhere(host, (r) => r.status !== 'waiting', 1500)
    await call(host, 'race:ready', { code, ready: true })
    await guestSees
    await quiet
  })

  test('cancelling ready disarms, and a later pair still starts', async () => {
    const { host, guest, code } = await seated()
    await call(host, 'race:ready', { code, ready: true })
    const disarmed = stateWhere(guest, (r) => r.players[host.id!]?.ready === false)
    await call(host, 'race:ready', { code, ready: false })
    await disarmed

    const stillWaiting = noStateWhere(host, (r) => r.status !== 'waiting', 1000)
    await call(guest, 'race:ready', { code, ready: true })
    await stillWaiting

    const counting = stateWhere(host, (r) => r.status === 'countdown')
    await call(host, 'race:ready', { code, ready: true })
    await counting
  })

  test('both ready runs a countdown on a server timestamp, then the race', async () => {
    const { host, guest, code } = await seated()
    const counting = stateWhere(guest, (r) => r.status === 'countdown')
    await call(host, 'race:ready', { code, ready: true })
    const pressedAt = Date.now()
    await call(guest, 'race:ready', { code, ready: true })

    const room = await counting
    expect(room.startAt! - pressedAt).toBeGreaterThan(3000)
    expect(room.startAt! - pressedAt).toBeLessThan(4200)
    expect(room.endAt! - room.startAt!).toBe(60_000)

    const running = await stateWhere(host, (r) => r.status === 'racing', 6000)
    expect(running.seed).toBe(room.seed)
  })

  test('a stranger cannot arm a seat they do not hold', async () => {
    const { host, code } = await seated()
    const quiet = noStateWhere(host, (r) => Object.values(r.players).some((p) => p.ready), 1200)
    expect(await call(await connect(), 'race:ready', { code, ready: true })).toEqual({ ok: false })
    await quiet
  })

  test('leaving at the gate frees the seat and disarms whoever stays', async () => {
    const { host, guest, code } = await seated()
    await call(host, 'race:ready', { code, ready: true })
    const alone = stateWhere(
      host,
      (r) => Object.keys(r.players).length === 1 && r.players[host.id!]?.ready === false
    )
    guest.emit('race:leave')
    expect((await alone).status).toBe('waiting')
  })
})

test.describe('racing', () => {
  test('progress reaches the opponent, and only the opponent', async () => {
    const { host, guest, code } = await racing()
    const toGuest = collect<{ id: string; progress: number }>(guest, 'race:opponent', 900)
    const toHost = collect(host, 'race:opponent', 900)
    host.emit('race:progress', { code, progress: 0.42, wpm: 71, accuracy: 97 })
    expect(await toGuest).toContainEqual(expect.objectContaining({ id: host.id, progress: 0.42, wpm: 71 }))
    expect(await toHost).toHaveLength(0)
  })

  test('progress is clamped before it is relayed', async () => {
    const { host, guest, code } = await racing()
    const toGuest = collect<{ progress: number; wpm: number; accuracy: number }>(guest, 'race:opponent', 900)
    host.emit('race:progress', { code, progress: 9, wpm: -5, accuracy: 400 })
    expect((await toGuest)[0]).toMatchObject({ progress: 1, wpm: 0, accuracy: 100 })
  })

  test('progress from someone not in the room is not relayed', async () => {
    const { host, code } = await racing()
    const toHost = collect(host, 'race:opponent', 900)
    ;(await connect()).emit('race:progress', { code, progress: 0.9, wpm: 200, accuracy: 100 })
    expect(await toHost).toHaveLength(0)
  })

  test('progress before the race starts is not relayed', async () => {
    const { host, guest, code } = await seated()
    const toGuest = collect(guest, 'race:opponent', 900)
    host.emit('race:progress', { code, progress: 0.5, wpm: 90, accuracy: 99 })
    expect(await toGuest).toHaveLength(0)
  })

  test('the race finishes when both players report', async () => {
    const { host, guest, code } = await racing()
    const done = stateWhere(guest, (r) => r.status === 'finished')
    host.emit('race:finish', { code, wpm: 88, accuracy: 97 })
    guest.emit('race:finish', { code, wpm: 61, accuracy: 93 })
    const room = await done
    expect(room.players[host.id!]).toMatchObject({ finished: true, wpm: 88, accuracy: 97 })
    expect(room.players[guest.id!]).toMatchObject({ finished: true, wpm: 61, accuracy: 93 })
  })

  test('finishing keeps the position the player actually reached', async () => {
    const { host, guest, code } = await racing()
    host.emit('race:progress', { code, progress: 0.31, wpm: 70, accuracy: 96 })
    await collect(guest, 'race:opponent', 400)
    const seen = stateWhere(guest, (r) => r.players[host.id!]?.finished === true)
    host.emit('race:finish', { code, wpm: 70, accuracy: 96 })
    expect((await seen).players[host.id!].progress).toBeCloseTo(0.31, 5)
  })

  test('a finish sent at the gate does not end a race that never ran', async () => {
    const { host, guest, code } = await seated()
    const quiet = noStateWhere(host, (r) => r.status === 'finished', 1200)
    host.emit('race:finish', { code, wpm: 999, accuracy: 100 })
    guest.emit('race:finish', { code, wpm: 999, accuracy: 100 })
    await quiet
  })

  test('a disconnect mid-race keeps the seat, and the survivor can still finish', async () => {
    const { host, guest, code } = await racing()
    const guestId = guest.id!
    const dropped = stateWhere(host, (r) => r.players[guestId]?.connected === false)
    guest.disconnect()
    const room = await dropped
    expect(room.status).toBe('racing')
    expect(room.players[guestId].name).toBe('Grace')

    const done = stateWhere(host, (r) => r.status === 'finished')
    host.emit('race:finish', { code, wpm: 70, accuracy: 95 })
    await done
  })

  test('the server ends the race at its deadline even if no client ever reports', async () => {
    // A frozen or heavily throttled tab never sends race:finish. Without a
    // server-side deadline the other player waits on a result forever.
    test.setTimeout(100_000)
    const { host, room } = await racing()
    const ended = await stateWhere(host, (r) => r.status === 'finished', room.endAt! - Date.now() + 8000)
    expect(Date.now()).toBeGreaterThanOrEqual(room.endAt! - 250)
    expect(Object.values(ended.players).every((p) => p.finished)).toBe(true)
  })
})

test.describe('coming back after a dropped connection', () => {
  test('a player who drops mid-race takes their seat back and still gets the result', async () => {
    const { host, guest, code, guestKey } = await racing()
    const oldId = guest.id!
    host.emit('race:progress', { code, progress: 0.2, wpm: 50, accuracy: 95 })

    const dropped = stateWhere(host, (r) => r.players[oldId]?.connected === false)
    guest.disconnect()
    await dropped

    const back = await connect()
    const returned = stateWhere(host, (r) => r.players[back.id!]?.connected === true)
    const reply = await call<{ ok: boolean; room: Room; you: string }>(back, 'race:resume', { code, key: guestKey })
    expect(reply.ok).toBe(true)
    expect(reply.you).toBe(back.id)
    expect(reply.room.players[oldId]).toBeUndefined()
    expect(reply.room.players[back.id!]).toMatchObject({ name: 'Grace', connected: true })
    await returned

    // Their progress counts again, and they hear the race.
    const toHost = collect<{ id: string }>(host, 'race:opponent', 900)
    const toBack = collect(back, 'race:opponent', 900)
    back.emit('race:progress', { code, progress: 0.44, wpm: 72, accuracy: 96 })
    host.emit('race:progress', { code, progress: 0.3, wpm: 60, accuracy: 96 })
    expect(await toHost).toContainEqual(expect.objectContaining({ id: back.id }))
    expect((await toBack).length).toBeGreaterThan(0)

    const done = stateWhere(back, (r) => r.status === 'finished')
    host.emit('race:finish', { code, wpm: 60, accuracy: 96 })
    back.emit('race:finish', { code, wpm: 72, accuracy: 96 })
    await done
  })

  test('a dropped seat at the gate is held, so the room is not given away', async () => {
    const { host, guest, code, guestKey } = await seated()
    const oldId = guest.id!
    const dropped = stateWhere(host, (r) => r.players[oldId]?.connected === false)
    guest.disconnect()
    expect(Object.keys((await dropped).players)).toHaveLength(2)

    expect(await call(await connect(), 'race:join', { code, name: 'Thief' })).toEqual({ ok: false, reason: 'full' })

    const back = await connect()
    expect((await call(back, 'race:resume', { code, key: guestKey })).ok).toBe(true)
  })

  test('a host alone in the lobby who drops keeps the room open for the friend they sent the code to', async () => {
    const host = await connect()
    const hostKey = randomUUID()
    const created = await call<{ room: Room }>(host, 'race:create', { name: 'Ada', key: hostKey })
    const code = created.room.code
    host.disconnect()

    const friend = await connect()
    const joined = await call<{ ok: boolean }>(friend, 'race:join', { code, name: 'Grace', key: randomUUID() })
    expect(joined.ok).toBe(true)

    const back = await connect()
    const reply = await call<{ ok: boolean; room: Room }>(back, 'race:resume', { code, key: hostKey })
    expect(reply.ok).toBe(true)
    expect(Object.values(reply.room.players).map((p) => p.name)).toEqual(['Ada', 'Grace'])
  })

  test('resuming with the wrong key, or into a room that does not exist, is refused', async () => {
    const { guest, code } = await seated()
    guest.disconnect()
    const back = await connect()
    expect(await call(back, 'race:resume', { code, key: randomUUID() })).toEqual({ ok: false, reason: 'no-seat' })
    expect(await call(back, 'race:resume', { code, key: 'not a key' })).toEqual({ ok: false, reason: 'no-seat' })
    expect(await call(back, 'race:resume', { code: '000003', key: randomUUID() })).toEqual({
      ok: false,
      reason: 'not-found',
    })
  })

  test('once a seat is reclaimed, the old connection no longer hears the room', async () => {
    // Two tabs holding the same seat key: a duplicated tab, say.
    const { host, guest, code, guestKey } = await seated()
    const second = await connect()
    expect((await call(second, 'race:resume', { code, key: guestKey })).ok).toBe(true)

    const toOld = collect(guest, 'race:state', 1000)
    const toNew = collect(second, 'race:state', 1000)
    await call(host, 'race:ready', { code, ready: true })
    expect(await toOld).toHaveLength(0)
    expect((await toNew).length).toBeGreaterThan(0)
  })
})

test.describe('rematch', () => {
  test('returns a finished room to the gate with both unready and a fresh passage', async () => {
    const { host, guest, code } = await finished()
    const reset = stateWhere(guest, (r) => r.status === 'waiting')
    expect(await call(host, 'race:rematch', { code })).toEqual({ ok: true })
    const room = await reset
    for (const p of Object.values(room.players)) {
      expect(p).toMatchObject({ ready: false, finished: false, progress: 0, wpm: 0, accuracy: 100 })
    }
    expect(room.startAt).toBeNull()
    // Only the player who pressed is back in the lobby; the other is still on the result.
    expect(room.players[host.id!].inLobby).toBe(true)
    expect(room.players[guest.id!].inLobby).toBe(false)
  })

  test('a rematch lands at the gate and does not start a countdown by itself', async () => {
    const { host, code } = await finished()
    const quiet = noStateWhere(host, (r) => r.status === 'countdown', 1500)
    await call(host, 'race:rematch', { code })
    await quiet
  })

  test('the player still on the result cannot arm, until they press rematch too', async () => {
    const { host, guest, code } = await finished()
    await call(host, 'race:rematch', { code })
    const guestId = guest.id!
    const noArm = noStateWhere(host, (r) => r.players[guestId]?.ready === true, 1000)
    await call(guest, 'race:ready', { code, ready: true })
    await noArm

    const back = stateWhere(host, (r) => r.players[guestId]?.inLobby === true)
    expect(await call(guest, 'race:rematch', { code })).toEqual({ ok: true })
    await back
  })

  test('when both press rematch at once, both end up in the lobby', async () => {
    const { host, guest, code } = await finished()
    const replies = await Promise.all([
      call<{ ok: boolean; reason?: string }>(host, 'race:rematch', { code }),
      call<{ ok: boolean; reason?: string }>(guest, 'race:rematch', { code }),
    ])
    expect(replies).toEqual([{ ok: true }, { ok: true }])
    const both = stateWhere(host, (r) => Object.values(r.players).every((p) => p.inLobby), 2000)
    // A state carrying both may already have gone by; ask for a fresh one.
    await call(host, 'race:ready', { code, ready: false })
    const room = await both
    expect(room.status).toBe('waiting')
  })

  test('a stranger who knows the code cannot reset someone else’s result', async () => {
    const { host, code } = await finished()
    const quiet = noStateWhere(host, (r) => r.status === 'waiting', 1200)
    expect(await call(await connect(), 'race:rematch', { code })).toEqual({ ok: false, reason: 'not-in-room' })
    await quiet
  })

  test('cannot rematch an opponent who has gone', async () => {
    const { host, guest, code } = await racing()
    // socket.io clears socket.id on disconnect, so read it first
    const guestId = guest.id!
    const dropped = stateWhere(host, (r) => r.players[guestId]?.connected === false)
    guest.disconnect()
    await dropped
    const done = stateWhere(host, (r) => r.status === 'finished')
    host.emit('race:finish', { code, wpm: 60, accuracy: 90 })
    await done
    expect(await call(host, 'race:rematch', { code })).toEqual({ ok: false, reason: 'opponent-left' })
  })
})
