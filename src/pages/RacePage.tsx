import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, Check, Copy, Flame, Loader2, Zap } from 'lucide-react'
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

/**
 * Short enough that a name still reads as a key legend rather than a banner.
 * The server enforces the same cap, because a client can send anything.
 */
const NAME_MAX = 8

const LEVELS: { id: Difficulty; Icon: typeof Zap }[] = [
  { id: 'easy', Icon: Zap },
  { id: 'medium', Icon: Brain },
  { id: 'hard', Icon: Flame },
]

/** What the race promises, scannable before anyone commits. */
const CLAIMS = ['Same passage', 'Same timer', 'See them word by word']

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
    sendReady,
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
  const [toast, setToast] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const wasConnected = useRef<Record<string, boolean>>({})

  // A disconnect is worth telling the other player about, but not worth
  // stopping their race for — the clock keeps running and so do they.
  useEffect(() => {
    if (!room || !you) return

    const snapshot: Record<string, boolean> = {}
    for (const player of Object.values(room.players)) {
      snapshot[player.id] = player.connected
      const dropped = wasConnected.current[player.id] === true && !player.connected
      if (player.id !== you && dropped) setToast(`${player.name} disconnected`)
    }
    wasConnected.current = snapshot
  }, [room, you])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(id)
  }, [toast])

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

  // Stays in the room: nobody wants to re-share a code to play again. It lands
  // back on the ready gate rather than starting a countdown.
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

  // Clipboard can be refused (insecure context, permission), and a code nobody
  // can copy is still a code they can read off the keys.
  const handleCopy = useCallback(async () => {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }, [room])

  const phase = room?.status ?? 'setup'
  const seated = room ? Object.values(room.players) : []
  const me = you && room ? room.players[you] : undefined
  const them = seated.find((p) => p.id !== you)
  // Two seats filled but not started: that is the ready gate.
  const atGate = phase === 'waiting' && seated.length === 2

  const sameName = Boolean(
    me && them && me.name.trim().toLowerCase() === them.name.trim().toLowerCase()
  )

  const atmosphere = useMemo(
    () => (
      <div className={cn('tt-atmos', phase === 'racing' && 'is-calm')} aria-hidden="true">
        <i className="tt-plate" />
        {phase !== 'racing' && (
          <>
            <i className="tt-wash-a" />
            <i className="tt-wash-b" />
            {phase === 'finished' && <i className="tt-wash-them" />}
            <i
              className="tt-fk tt-fk-mid"
              style={{ left: -18, top: 250, width: 64, height: 64, fontSize: 19, transform: 'rotate(-9deg)' }}
            >
              T
            </i>
            <i
              className="tt-fk tt-fk-far"
              style={{ right: -26, top: 118, width: 92, height: 92, fontSize: 28, transform: 'rotate(6deg)' }}
            >
              E
            </i>
            <i
              className="tt-fk tt-fk-far"
              style={{ left: 64, bottom: -34, width: 86, height: 86, fontSize: 26, transform: 'rotate(7deg)' }}
            >
              P
            </i>
          </>
        )}
      </div>
    ),
    [phase]
  )

  return (
    <div className={cn('tt-race', phase === 'racing' && 'is-racing')}>
      {atmosphere}

      {toast && (
        <div className="tt-race-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <header className="tt-race-bar">
        <Logo size="small" showTagline={false} clickable />
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="tt-race-back"
            onClick={() => (room ? handleLeave() : navigate('/start'))}
          >
            <ArrowLeft className="h-4 w-4" />
            {room ? 'Leave' : 'Solo test'}
          </button>
          <ThemeOnlyToggle />
        </div>
      </header>

      {/* ---------------- setup ---------------- */}
      {!room && (
        <div className="tt-stage is-mid tt-race-setup">
          <div className="tt-split">
            <div>
              <h1>Race someone.</h1>

              <div className="tt-ticks">
                {CLAIMS.map((claim) => (
                  <span key={claim} className="tt-tick">
                    <Check aria-hidden="true" />
                    {claim}
                  </span>
                ))}
              </div>

              {!connected && (
                <div className="tt-race-note mt-5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waking the race server&hellip;
                </div>
              )}
              {error && <div className="tt-race-error">{error}</div>}

              <div className="tt-set">
                <label htmlFor="race-name">Your name</label>
                <input
                  id="race-name"
                  className="tt-namefield"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                  placeholder="Ada"
                  maxLength={NAME_MAX}
                />
              </div>

              <div className="tt-set">
                <label>How long</label>
                <div className="tt-keyrow">
                  {([1, 2, 5] as TimerOption[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimer(t)}
                      className={cn('tt-setkey', timer === t && 'is-on')}
                      aria-pressed={timer === t}
                    >
                      {t} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="tt-set">
                <label>How hard</label>
                <div className="tt-keyrow">
                  {LEVELS.map(({ id, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDifficulty(id)}
                      className={cn('tt-setkey', `is-${id}`, difficulty === id && 'is-on')}
                      aria-pressed={difficulty === id}
                    >
                      <Icon aria-hidden="true" />
                      {id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Two routes in, and only one of them is yours to start. */}
              <div className="tt-fork">
                <div className="tt-fork-side">
                  <p className="tt-fork-lab">You set it up</p>
                  <button
                    type="button"
                    className="tt-btn tt-btn-primary"
                    disabled={!connected || busy}
                    onClick={handleCreate}
                  >
                    Create a room
                  </button>
                </div>

                <div className="tt-fork-or" aria-hidden="true">
                  <span className="tt-fork-rule" />
                  <b>or</b>
                  <span className="tt-fork-rule" />
                </div>

                <div className="tt-fork-side">
                  <p className="tt-fork-lab">A friend sent you six digits</p>
                  <div className="tt-join">
                    <input
                      className="tt-code-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      inputMode="numeric"
                      aria-label="Room code"
                    />
                    <button
                      type="button"
                      className="tt-btn tt-btn-quiet"
                      disabled={!connected || busy || code.length < 6}
                      onClick={handleJoin}
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>

              {joinError && <div className="tt-race-error">{joinError}</div>}
            </div>

            {/* Your key, and the thing that makes this different from a solo test. */}
            <div className="tt-showcase" aria-hidden="true">
              <div className="tt-ghost" />
              <div className="tt-panel tt-stage-card">
                <p className="tt-cap-note">Your key</p>
                <div className="tt-namekey is-big is-you">{name.trim() || 'You'}</div>
                <div className="tt-hr" />
                <p className="tt-cap-note">How you see them</p>
                <div className="tt-mini">
                  <p className="typing-text m-0">
                    <span className="typing-char-correct">on delta</span>
                    <span className="typing-char-current">s</span>
                    <span className="tt-in-gap is-theirs typing-char-upcoming">
                      {' '}
                      have always accepted
                    </span>
                    <span className="tt-opp-here typing-char-upcoming" data-who="Grace" />
                    <span className="typing-char-upcoming"> periodic destruction in exchange</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- waiting for a second player ---------------- */}
      {room && phase === 'waiting' && !atGate && (
        <div className="tt-stage is-mid tt-race-lobby text-center">
          <p className="tt-race-eyebrow">
            Room open &middot; {room.timer} min &middot; {room.difficulty}
          </p>
          <h1 className="mt-3.5">Send this code.</h1>

          <div className="tt-code-keys mt-9">
            {room.code.split('').map((digit, index) => (
              <div key={index} className="tt-code-key">
                {digit}
              </div>
            ))}
          </div>

          <div className="mt-7">
            <button type="button" className="tt-copy" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>

          <div className="tt-panel tt-roster mt-9 text-left">
            <div className="tt-seat">
              <div className="tt-seat-left">
                <span className="tt-namekey is-you">{me?.name || 'You'}</span>
                <span className="tt-seat-mine">you</span>
              </div>
              <span className="tt-state is-ready">
                <i className="tt-dot" />
                HERE
              </span>
            </div>
            <div className="tt-seat">
              <div className="tt-seat-left">
                <span className="tt-namekey is-open">Open</span>
              </div>
              <span className="tt-race-note text-[13px]">
                <i className="tt-pulse" />
                Waiting
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ready up ---------------- */}
      {room && atGate && (
        <div className="tt-stage is-mid text-center">
          <p className="tt-race-eyebrow">
            Room {room.code} &middot; {room.timer} min &middot; {room.difficulty}
          </p>
          <h1 className="mt-3.5">Both ready?</h1>

          <div className="tt-panel tt-roster mt-8 text-left">
            {[me, them].map((player, index) =>
              player ? (
                <div key={player.id} className="tt-seat">
                  <div className="tt-seat-left">
                    <span className={cn('tt-namekey', index === 0 ? 'is-you' : 'is-them')}>
                      {sameName && <em>{index === 0 ? 'P1' : 'P2'}</em>}
                      {player.name}
                    </span>
                    {index === 0 && <span className="tt-seat-mine">you</span>}
                  </div>
                  <span className={cn('tt-state', player.ready ? 'is-ready' : 'is-waiting')}>
                    {player.ready && <i className="tt-dot" />}
                    {player.ready ? 'READY' : 'NOT READY'}
                  </span>
                </div>
              ) : null
            )}
          </div>

          <p className="tt-race-sub">
            {me?.ready
              ? `Waiting for ${them?.name ?? 'them'}. The countdown starts when you are both ready.`
              : 'The countdown starts when you are both ready.'}
          </p>

          <div className="tt-result-actions">
            <button
              type="button"
              className={cn('tt-btn', me?.ready ? 'tt-btn-quiet' : 'tt-btn-primary')}
              onClick={() => sendReady(room.code, !me?.ready)}
            >
              {me?.ready ? 'Cancel ready' : 'Ready'}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- countdown ---------------- */}
      {room && phase === 'countdown' && (
        <div className="tt-stage is-mid text-center">
          <div className="tt-countdown-number" key={countdown}>
            {countdown && countdown > 0 ? countdown : 'Type!'}
          </div>
          <p className="tt-race-sub">
            {seated.map((p) => p.name).join('  vs  ')}
          </p>
        </div>
      )}

      {room && you && phase === 'racing' && (
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
