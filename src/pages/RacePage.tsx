import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Logo from '@/components/Logo'
import { ThemeOnlyToggle } from '@/components/ThemeOnlyToggle'
import RaceTrack from '@/components/race/RaceTrack'
import RaceResult from '@/components/race/RaceResult'
import useRace, { type Difficulty, type JoinFailure, type TimerOption } from '@/hooks/useRace'
import { cn } from '@/lib/utils'

const JOIN_MESSAGES: Record<JoinFailure, string> = {
  'not-found': 'No race with that code. Check the digits and try again.',
  full: 'That race already has two players.',
  'in-progress': 'That race has already started.',
}

const RacePage = () => {
  const navigate = useNavigate()
  const {
    connected,
    room,
    you,
    error,
    serverNow,
    createRoom,
    joinRoom,
    sendProgress,
    sendFinish,
    requestRematch,
    leave,
  } = useRace()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [timer, setTimer] = useState<TimerOption>(1)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [rematchError, setRematchError] = useState<string | null>(null)

  // Driven off the server's start time rather than a local timer, so both
  // screens hit zero together.
  useEffect(() => {
    if (room?.status !== 'countdown' || !room.startAt) {
      setCountdown(null)
      return
    }

    const tick = () => setCountdown(Math.max(0, Math.ceil((room.startAt! - serverNow()) / 1000)))
    tick()
    const id = window.setInterval(tick, 120)
    return () => window.clearInterval(id)
  }, [room?.status, room?.startAt, serverNow])

  const handleCreate = async () => {
    setBusy(true)
    setJoinError(null)
    await createRoom(name, difficulty, timer)
    setBusy(false)
  }

  const handleJoin = async () => {
    setBusy(true)
    setJoinError(null)
    const failure = await joinRoom(code.trim(), name)
    if (failure) setJoinError(JOIN_MESSAGES[failure])
    setBusy(false)
  }

  // Stays in the room: nobody wants to re-share a code to play again.
  const handleRematch = useCallback(async () => {
    if (!room) return
    setRematchError(null)
    const failure = await requestRematch(room.code)
    if (failure === 'opponent-left') setRematchError('Your opponent has left the room.')
    else if (failure && failure !== 'already-starting') setRematchError('Could not start a rematch.')
  }, [room, requestRematch])

  const handleLeave = useCallback(() => {
    leave()
    setCode('')
    setJoinError(null)
    setRematchError(null)
  }, [leave])

  const phase = room?.status ?? 'setup'

  return (
    <div className="tt-race">
      <header className="tt-race-bar">
        <Logo size="small" showTagline={false} clickable />
        <div className="flex items-center gap-4">
          <button type="button" className="tt-race-back" onClick={() => navigate('/start')}>
            <ArrowLeft className="h-4 w-4" />
            Solo test
          </button>
          <ThemeOnlyToggle />
        </div>
      </header>

      {!room && (
        <div className="tt-race-setup">
          <h1>Race someone.</h1>
          <p className="tt-race-sub">
            Same text, same clock, one winner. Share a code with a friend and go.
          </p>

          {!connected && (
            <div className="tt-race-note">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waking the race server…
            </div>
          )}
          {error && <div className="tt-race-error">{error}</div>}

          <label className="tt-field">
            <span>Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="Player"
              maxLength={16}
            />
          </label>

          <div className="tt-race-columns">
            <section className="tt-race-panel">
              <h2>Start a race</h2>

              <div className="tt-chips">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={cn('tt-chip-btn', difficulty === d && 'is-on')}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="tt-chips">
                {([1, 2, 5] as TimerOption[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimer(t)}
                    className={cn('tt-chip-btn', timer === t && 'is-on')}
                  >
                    {t} min
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="tt-btn tt-btn-primary w-full"
                disabled={!connected || busy}
                onClick={handleCreate}
              >
                Create a room
              </button>
            </section>

            <section className="tt-race-panel">
              <h2>Join a race</h2>
              <input
                className="tt-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                aria-label="Room code"
              />
              {joinError && <div className="tt-race-error">{joinError}</div>}
              <button
                type="button"
                className="tt-btn tt-btn-quiet w-full"
                disabled={!connected || busy || code.length < 6}
                onClick={handleJoin}
              >
                Join
              </button>
            </section>
          </div>
        </div>
      )}

      {room && phase === 'waiting' && (
        <div className="tt-race-lobby">
          <p className="tt-race-eyebrow">Share this code</p>
          <div className="tt-race-code">{room.code}</div>
          <p className="tt-race-sub">
            {room.difficulty} · {room.timer} minute{room.timer > 1 ? 's' : ''}
          </p>
          <div className="tt-race-note">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for someone to join…
          </div>
          <button type="button" className="tt-btn tt-btn-quiet" onClick={handleLeave}>
            Cancel
          </button>
        </div>
      )}

      {room && phase === 'countdown' && (
        <div className="tt-race-countdown">
          <div className="tt-countdown-number" key={countdown}>
            {countdown && countdown > 0 ? countdown : 'Type!'}
          </div>
          <p className="tt-race-sub">
            {Object.values(room.players).map((p) => p.name).join('  vs  ')}
          </p>
        </div>
      )}

      {room && you && (phase === 'racing' || phase === 'countdown') && phase === 'racing' && (
        <RaceTrack
          room={room}
          you={you}
          serverNow={serverNow}
          onProgress={(p, w, a) => sendProgress(room.code, p, w, a)}
          onFinish={(w, a) => sendFinish(room.code, w, a)}
        />
      )}

      {room && you && phase === 'finished' && (
        <RaceResult
          room={room}
          you={you}
          onRematch={handleRematch}
          rematchError={rematchError}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}

export default RacePage
