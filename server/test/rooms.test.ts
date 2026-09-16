/**
 * Room state machine, tested directly.
 *
 *   npm test          (from server/)
 *
 * These run against the pure functions in rooms.ts, with no sockets, so every
 * transition can be driven precisely — including the ones a well-behaved
 * client never triggers but a stale or hostile one can, and the ones that
 * only happen after a minute or two of real time.
 */
import { beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
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
  roomCount,
  setReady,
  sweepStaleRooms,
  updateProgress,
} from '../src/race/rooms.js'

let seq = 0
const id = (label: string) => `${label}-${++seq}`
const keyFor = (playerId: string) => `key_${playerId}_0123456789abcdef`

/** Two players seated in a fresh room, not yet ready, each holding a seat key. */
function seated(timer: 1 | 2 | 5 = 1) {
  const a = id('a')
  const b = id('b')
  const room = createRoom(a, 'Ada', 'medium', timer, keyFor(a))
  assert.ok(joinRoom(room.code, b, 'Grace', keyFor(b)).ok)
  return { room, a, b }
}

/** Two players, both armed, countdown begun and marked racing. */
function racing() {
  const s = seated()
  setReady(s.room, s.a, true)
  assert.equal(setReady(s.room, s.b, true), true)
  beginCountdown(s.room)
  markRacing(s.room)
  return s
}

beforeEach(() => {
  // rooms live in module memory; a far-future sweep empties it between tests
  sweepStaleRooms(Date.now() + 10 * 365 * 24 * 3600 * 1000)
})

describe('createRoom', () => {
  test('opens a waiting room with the host seated and not ready', () => {
    const host = id('host')
    const room = createRoom(host, 'Ada', 'hard', 2)
    assert.match(room.code, /^\d{6}$/)
    assert.equal(room.status, 'waiting')
    assert.equal(room.difficulty, 'hard')
    assert.equal(room.timer, 2)
    assert.equal(room.startAt, null)
    assert.equal(room.endAt, null)
    assert.ok(Number.isInteger(room.seed))
    assert.deepEqual(Object.keys(room.players), [host])
    assert.equal(room.players[host].ready, false)
    assert.equal(room.players[host].connected, true)
    assert.equal(getRoom(room.code), room)
  })

  test('never hands out the same code twice while rooms are open', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 300; i += 1) codes.add(createRoom(id('h'), 'x', 'easy', 1).code)
    assert.equal(codes.size, 300)
    assert.equal(roomCount(), 300)
  })

  test('never exposes a seat key in the room state', () => {
    const host = id('host')
    const room = createRoom(host, 'Ada', 'easy', 1, keyFor(host))
    assert.equal(JSON.stringify(room).includes(keyFor(host)), false)
  })
})

describe('joinRoom', () => {
  test('rejects a code that does not exist', () => {
    assert.deepEqual(joinRoom('000000', id('p'), 'x'), { ok: false, reason: 'not-found' })
  })

  test('seats a second player, not ready', () => {
    const { room, b } = seated()
    assert.equal(Object.keys(room.players).length, 2)
    assert.equal(room.players[b].ready, false)
    assert.equal(room.status, 'waiting')
  })

  test('joining a room you are already seated in changes nothing', () => {
    const { room, b } = seated()
    assert.equal(joinRoom(room.code, b, 'Other').ok, true)
    assert.equal(room.players[b].name, 'Grace')
    assert.equal(Object.keys(room.players).length, 2)
  })

  test('rejects a third player', () => {
    const { room } = seated()
    assert.deepEqual(joinRoom(room.code, id('c'), 'x'), { ok: false, reason: 'full' })
  })

  test('a held seat still counts, so the room is not given away', () => {
    const { room, b } = seated()
    removePlayer(b, 'dropped')
    assert.deepEqual(joinRoom(room.code, id('c'), 'x'), { ok: false, reason: 'full' })
  })

  test('rejects anyone once the race has left the waiting state', () => {
    const { room, b } = racing()
    removePlayer(b)
    assert.deepEqual(joinRoom(room.code, id('late'), 'x'), { ok: false, reason: 'in-progress' })
  })
})

describe('peekRoom', () => {
  test('shows who is waiting and what they chose, and seats nobody', () => {
    const host = id('host')
    const room = createRoom(host, 'Ada', 'hard', 5)
    assert.deepEqual(peekRoom(room.code), { ok: true, opponent: 'Ada', difficulty: 'hard', timer: 5 })
    assert.deepEqual(Object.keys(room.players), [host])
  })

  test('gives the reason a join would fail', () => {
    assert.deepEqual(peekRoom('000000'), { ok: false, reason: 'not-found' })
    const { room } = seated()
    assert.deepEqual(peekRoom(room.code), { ok: false, reason: 'full' })
    const running = racing()
    assert.deepEqual(peekRoom(running.room.code), { ok: false, reason: 'in-progress' })
  })

  test('a held seat still counts as taken', () => {
    const { room, b } = seated()
    removePlayer(b, 'dropped')
    assert.deepEqual(peekRoom(room.code), { ok: false, reason: 'full' })
  })

  test('names whoever stayed when the host walks away from the gate', () => {
    const { room, a } = seated()
    removePlayer(a)
    assert.deepEqual(peekRoom(room.code), { ok: true, opponent: 'Grace', difficulty: 'medium', timer: 1 })
  })
})

describe('setReady — the gate', () => {
  test('a lone player can arm but it never completes the pair', () => {
    const host = id('solo')
    const room = createRoom(host, 'Ada', 'easy', 1)
    assert.equal(setReady(room, host, true), false)
    assert.equal(room.players[host].ready, true)
  })

  test('one of two ready does not start anything', () => {
    const { room, a } = seated()
    assert.equal(setReady(room, a, true), false)
    assert.equal(room.status, 'waiting')
  })

  test('the press that completes the pair returns true', () => {
    const { room, a, b } = seated()
    setReady(room, a, true)
    assert.equal(setReady(room, b, true), true)
  })

  test('cancelling ready clears the flag and breaks the pair', () => {
    const { room, a, b } = seated()
    setReady(room, a, true)
    setReady(room, a, false)
    assert.equal(room.players[a].ready, false)
    assert.equal(setReady(room, b, true), false)
  })

  test('is refused outside the waiting state', () => {
    const { room, a } = racing()
    assert.equal(setReady(room, a, true), false)
  })

  test('is refused for someone not seated in the room', () => {
    const { room } = seated()
    assert.equal(setReady(room, id('stranger'), true), false)
  })

  test('a player whose connection dropped cannot complete the pair', () => {
    const { room, a, b } = seated()
    setReady(room, a, true)
    removePlayer(a, 'dropped')
    assert.equal(setReady(room, b, true), false)
  })
})

describe('countdown and racing', () => {
  test('the countdown is a server timestamp with the race length after it', () => {
    const { room } = seated(2)
    const before = Date.now()
    beginCountdown(room)
    assert.equal(room.status, 'countdown')
    assert.ok(room.startAt! >= before + 3400 && room.startAt! <= Date.now() + 3600)
    assert.equal(room.endAt! - room.startAt!, 2 * 60_000)
  })

  test('markRacing only advances from countdown', () => {
    const { room } = seated()
    markRacing(room)
    assert.equal(room.status, 'waiting')
    beginCountdown(room)
    markRacing(room)
    assert.equal(room.status, 'racing')
  })
})

describe('updateProgress', () => {
  test('clamps what a client reports', () => {
    const { room, a } = racing()
    updateProgress(room, a, 5, -40.4, 180)
    assert.equal(room.players[a].progress, 1)
    assert.equal(room.players[a].wpm, 0)
    assert.equal(room.players[a].accuracy, 100)
    updateProgress(room, a, -2, 71.6, -9)
    assert.equal(room.players[a].progress, 0)
    assert.equal(room.players[a].wpm, 72)
    assert.equal(room.players[a].accuracy, 0)
  })

  test('ignores a player who has already finished', () => {
    const { room, a } = racing()
    finishPlayer(room, a, 50, 90)
    updateProgress(room, a, 0.2, 10, 10)
    assert.equal(room.players[a].wpm, 50)
  })

  test('ignores someone not in the room', () => {
    const { room } = racing()
    assert.doesNotThrow(() => updateProgress(room, id('ghost'), 0.5, 99, 99))
    assert.equal(Object.keys(room.players).length, 2)
  })

  test('is ignored when no race is running', () => {
    const { room, a } = seated()
    updateProgress(room, a, 0.6, 80, 95)
    assert.equal(room.players[a].progress, 0)
    assert.equal(room.players[a].wpm, 0)
  })
})

describe('finishPlayer', () => {
  test('the race ends only when every connected player is done', () => {
    const { room, a, b } = racing()
    finishPlayer(room, a, 80, 95)
    assert.equal(room.status, 'racing')
    finishPlayer(room, b, 70, 90)
    assert.equal(room.status, 'finished')
    assert.equal(room.players[a].wpm, 80)
    assert.equal(room.players[b].accuracy, 90)
  })

  test('an opponent who has gone does not hold the race open', () => {
    const { room, a, b } = racing()
    removePlayer(b, 'dropped')
    finishPlayer(room, a, 60, 99)
    assert.equal(room.status, 'finished')
  })

  test('a finish sent before the race runs does not end a race that never started', () => {
    const { room, a, b } = seated()
    finishPlayer(room, a, 900, 100)
    finishPlayer(room, b, 900, 100)
    assert.equal(room.status, 'waiting')
    assert.equal(room.players[a].finished, false)
  })

  test('finishing keeps where the player actually got to', () => {
    // The opponent's marker is drawn from progress. Snapping it to 1 on
    // finish throws the marker to the end of the passage for whoever is
    // still racing in the instant before their own clock stops.
    const { room, a } = racing()
    updateProgress(room, a, 0.31, 70, 96)
    finishPlayer(room, a, 70, 96)
    assert.equal(room.players[a].progress, 0.31)
  })
})

describe('endRace — the server deadline', () => {
  test('finishes everyone still connected, keeping what they last reported', () => {
    const { room, a, b } = racing()
    updateProgress(room, a, 0.4, 66, 94)
    endRace(room)
    assert.equal(room.status, 'finished')
    assert.equal(room.players[a].finished, true)
    assert.equal(room.players[a].wpm, 66)
    assert.equal(room.players[b].finished, true)
  })

  test('leaves a disconnected player unfinished, so the result can say they left', () => {
    const { room, a, b } = racing()
    removePlayer(b, 'dropped')
    endRace(room)
    assert.equal(room.status, 'finished')
    assert.equal(room.players[a].finished, true)
    assert.equal(room.players[b].finished, false)
  })

  test('does nothing to a room that is not racing', () => {
    const { room } = seated()
    endRace(room)
    assert.equal(room.status, 'waiting')
  })
})

describe('requestRematch', () => {
  test('reports a missing room', () => {
    assert.deepEqual(requestRematch('999999', id('p')), { ok: false, reason: 'not-found' })
  })

  test('refuses someone who is not seated in the room', () => {
    const { room, a, b } = racing()
    finishPlayer(room, a, 1, 1)
    finishPlayer(room, b, 1, 1)
    assert.deepEqual(requestRematch(room.code, id('stranger')), { ok: false, reason: 'not-in-room' })
    assert.equal(room.status, 'finished')
  })

  test('is refused while waiting, and while a countdown is running', () => {
    const { room, a } = seated()
    assert.deepEqual(requestRematch(room.code, a), { ok: false, reason: 'not-finished' })
    beginCountdown(room)
    assert.deepEqual(requestRematch(room.code, a), { ok: false, reason: 'already-starting' })
  })

  test('returns a finished room to the gate with a fresh passage', () => {
    const { room, a, b } = racing()
    updateProgress(room, a, 0.4, 90, 97)
    finishPlayer(room, a, 90, 97)
    finishPlayer(room, b, 60, 91)
    const seed = room.seed

    // the seed is random; retry the vanishingly rare collision rather than flake
    let result = requestRematch(room.code, a)
    for (let i = 0; i < 5 && result.ok && room.seed === seed; i += 1) {
      room.status = 'finished'
      result = requestRematch(room.code, a)
    }

    assert.equal(result.ok, true)
    assert.equal(room.status, 'waiting')
    assert.notEqual(room.seed, seed)
    assert.equal(room.startAt, null)
    assert.equal(room.endAt, null)
    for (const p of Object.values(room.players)) {
      assert.equal(p.ready, false)
      assert.equal(p.finished, false)
      assert.equal(p.progress, 0)
      assert.equal(p.wpm, 0)
      assert.equal(p.accuracy, 100)
    }
    // Only the player who asked goes back to the lobby. The other stays on the result.
    assert.equal(room.players[a].inLobby, true)
    assert.equal(room.players[b].inLobby, false)
  })

  test('the second player to press rematch joins the lobby without resetting it again', () => {
    const { room, a, b } = racing()
    finishPlayer(room, a, 1, 1)
    finishPlayer(room, b, 1, 1)
    assert.equal(requestRematch(room.code, a).ok, true)
    const seed = room.seed
    assert.deepEqual(requestRematch(room.code, b), { ok: true, room })
    assert.equal(room.players[b].inLobby, true)
    assert.equal(room.seed, seed)
    // Pressing again once in the lobby changes nothing.
    assert.deepEqual(requestRematch(room.code, b), { ok: false, reason: 'not-finished' })
  })

  test('someone still on the result cannot arm for the next race', () => {
    const { room, a, b } = racing()
    finishPlayer(room, a, 1, 1)
    finishPlayer(room, b, 1, 1)
    requestRematch(room.code, a)
    assert.equal(setReady(room, a, true), false)
    assert.equal(setReady(room, b, true), false)
    assert.equal(room.players[b].ready, false)

    requestRematch(room.code, b)
    assert.equal(setReady(room, b, true), true)
  })

  test('a rematch is refused once the player who asked has walked away from the lobby', () => {
    const { room, a, b } = racing()
    finishPlayer(room, a, 1, 1)
    finishPlayer(room, b, 1, 1)
    requestRematch(room.code, a)
    removePlayer(a)
    assert.deepEqual(requestRematch(room.code, b), { ok: false, reason: 'opponent-left' })
  })

  test('cannot rematch someone who has gone', () => {
    const { room, a, b } = racing()
    removePlayer(b, 'dropped')
    finishPlayer(room, a, 50, 90)
    assert.deepEqual(requestRematch(room.code, a), { ok: false, reason: 'opponent-left' })
  })
})

describe('removePlayer — leaving versus dropping', () => {
  test('leaving at the gate frees the seat and disarms whoever is left', () => {
    const { room, a, b } = seated()
    setReady(room, a, true)
    removePlayer(b, 'left')
    assert.equal(room.players[b], undefined)
    assert.equal(room.players[a].ready, false)
    assert.equal(joinRoom(room.code, id('new'), 'x').ok, true)
  })

  test('dropping at the gate holds the seat, disconnected and unready', () => {
    const { room, a, b } = seated()
    setReady(room, b, true)
    setReady(room, a, true) // completes the pair, but no countdown was begun
    room.status = 'waiting'
    const result = removePlayer(b, 'dropped')
    assert.equal(result?.room, room)
    assert.equal(room.players[b].connected, false)
    assert.equal(room.players[b].ready, false)
  })

  test('the last player leaving deletes the room', () => {
    const host = id('last')
    const room = createRoom(host, 'Ada', 'easy', 1)
    assert.deepEqual(removePlayer(host, 'left'), { code: room.code, room: null })
    assert.equal(getRoom(room.code), undefined)
  })

  test('the last player dropping keeps the room open for them', () => {
    // A host alone in the lobby, gone to another app to send the code.
    const host = id('alone')
    const room = createRoom(host, 'Ada', 'easy', 1, keyFor(host))
    removePlayer(host, 'dropped')
    assert.equal(getRoom(room.code), room)
    assert.equal(joinRoom(room.code, id('friend'), 'Grace').ok, true)
  })

  test('mid-race, keeps the seat so the other player still sees who they raced', () => {
    const { room, b } = racing()
    removePlayer(b, 'left')
    assert.equal(room.players[b].connected, false)
    assert.equal(room.status, 'racing')
  })

  test('mid-race, the race ends when everyone has chosen to leave', () => {
    const { room, a, b } = racing()
    removePlayer(a, 'left')
    removePlayer(b, 'left')
    assert.equal(room.status, 'finished')
  })

  test('mid-race, a dropped connection does not end the race — the deadline does', () => {
    const { room, a, b } = racing()
    removePlayer(a, 'dropped')
    removePlayer(b, 'dropped')
    assert.equal(room.status, 'racing')
  })

  test('acts on the seat the player holds now, not one they let go earlier', () => {
    const { room: first, a } = racing()
    removePlayer(a, 'left') // still in `first`, disconnected
    const second = createRoom(a, 'Ada', 'easy', 1)
    removePlayer(a, 'dropped')
    assert.equal(second.players[a].connected, false)
    assert.equal(first.players[a].connected, false)
  })

  test('can spare one room, for a player moving to it', () => {
    const { room: first, a } = seated()
    const second = createRoom(id('h'), 'Linus', 'easy', 1)
    joinRoom(second.code, a, 'Ada')
    removePlayer(a, 'left', second.code)
    assert.equal(first.players[a], undefined)
    assert.equal(second.players[a].connected, true)
  })

  test('someone in no room is a no-op', () => {
    assert.equal(removePlayer(id('nobody')), undefined)
  })
})

describe('resumeSeat — coming back', () => {
  test('moves a dropped seat to the new connection, keeping everything in it', () => {
    const { room, a, b } = racing()
    updateProgress(room, b, 0.37, 64, 95)
    removePlayer(b, 'dropped')

    const back = id('b-again')
    const result = resumeSeat(room.code, keyFor(b), back)

    assert.equal(result.ok, true)
    assert.equal(room.players[b], undefined)
    assert.deepEqual(
      { ...room.players[back] },
      // Dropping disarms: the returning player presses Ready again if it matters.
      {
        id: back,
        name: 'Grace',
        progress: 0.37,
        wpm: 64,
        accuracy: 95,
        finished: false,
        connected: true,
        ready: false,
        inLobby: true,
      }
    )
    assert.deepEqual(Object.keys(room.players), [a, back])
  })

  test('the host coming back is still the host, and still listed first', () => {
    const { room, a, b } = seated()
    removePlayer(a, 'dropped')
    const back = id('a-again')
    assert.equal(resumeSeat(room.code, keyFor(a), back).ok, true)
    assert.equal(room.hostId, back)
    assert.deepEqual(Object.keys(room.players), [back, b])
  })

  test('works again after a second drop, under the next new id', () => {
    const { room, b } = racing()
    removePlayer(b, 'dropped')
    const once = id('b1')
    resumeSeat(room.code, keyFor(b), once)
    removePlayer(once, 'dropped')
    const twice = id('b2')
    assert.equal(resumeSeat(room.code, keyFor(b), twice).ok, true)
    assert.equal(room.players[twice].connected, true)
  })

  test('refuses a wrong key, a missing key and a missing room', () => {
    const { room, b } = seated()
    removePlayer(b, 'dropped')
    assert.deepEqual(resumeSeat(room.code, 'key_wrong_0123456789abcdef', id('x')), { ok: false, reason: 'no-seat' })
    assert.deepEqual(resumeSeat(room.code, '', id('x')), { ok: false, reason: 'no-seat' })
    assert.deepEqual(resumeSeat('123456', keyFor(b), id('x')), { ok: false, reason: 'not-found' })
  })

  test('someone who chose to leave cannot come back into the seat', () => {
    const { room, b } = racing()
    removePlayer(b, 'left')
    assert.deepEqual(resumeSeat(room.code, keyFor(b), id('x')), { ok: false, reason: 'no-seat' })
  })
})

describe('expireDroppedSeat — the grace period', () => {
  test('holds the seat inside the grace period and frees it after', () => {
    const { room, a, b } = seated()
    removePlayer(b, 'dropped')
    assert.equal(expireDroppedSeat(b, Date.now() + 1000), undefined)
    assert.equal(room.players[b].connected, false)

    const expired = expireDroppedSeat(b, Date.now() + SEAT_GRACE_MS + 1)
    assert.equal(expired?.room, room)
    assert.equal(room.players[b], undefined)
    assert.ok(room.players[a])
  })

  test('deletes the room when the expired seat was the only one', () => {
    const host = id('gone')
    const room = createRoom(host, 'Ada', 'easy', 1, keyFor(host))
    removePlayer(host, 'dropped')
    assert.deepEqual(expireDroppedSeat(host, Date.now() + SEAT_GRACE_MS + 1), { code: room.code, room: null })
    assert.equal(getRoom(room.code), undefined)
  })

  test('does nothing to a seat that has been reclaimed', () => {
    const { room, b } = seated()
    removePlayer(b, 'dropped')
    const back = id('back')
    resumeSeat(room.code, keyFor(b), back)
    assert.equal(expireDroppedSeat(b, Date.now() + SEAT_GRACE_MS + 1), undefined)
    assert.equal(room.players[back].connected, true)
  })

  test('never frees a seat while its race is still running', () => {
    const { room, b } = racing()
    removePlayer(b, 'dropped')
    assert.equal(expireDroppedSeat(b, Date.now() + SEAT_GRACE_MS + 1), undefined)
    assert.ok(room.players[b])
  })
})

describe('sweepStaleRooms', () => {
  test('keeps a live room and removes one idle past an hour', () => {
    const room = createRoom(id('h'), 'Ada', 'easy', 1)
    assert.equal(sweepStaleRooms(Date.now() + 60_000), 0)
    assert.equal(sweepStaleRooms(Date.now() + 60 * 60 * 1000 + 1), 1)
    assert.equal(getRoom(room.code), undefined)
  })

  test('measures idleness from the last activity, not from when the room opened', () => {
    // Two friends rematching for over an hour are using the room.
    const { room, a } = seated()
    room.createdAt -= 2 * 60 * 60 * 1000
    setReady(room, a, true)
    assert.equal(sweepStaleRooms(Date.now() + 1000), 0)
    assert.equal(getRoom(room.code), room)
  })

  test('keeps a room whose players dropped until their grace runs out', () => {
    const { a, b } = racing()
    removePlayer(a, 'dropped')
    removePlayer(b, 'dropped')
    assert.equal(sweepStaleRooms(Date.now() + 1000), 0)
    assert.equal(sweepStaleRooms(Date.now() + SEAT_GRACE_MS + 1), 1)
  })

  test('removes at once a room everyone chose to leave', () => {
    const { a, b } = racing()
    removePlayer(a, 'left')
    removePlayer(b, 'left')
    assert.equal(sweepStaleRooms(Date.now()), 1)
  })
})
