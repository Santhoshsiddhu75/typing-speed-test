import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, Check, Copy, Flame, Loader2, Zap } from 'lucide-react'
import Logo from '@/components/Logo'
import { ThemeOnlyToggle } from '@/components/ThemeOnlyToggle'
import RaceTrack from '@/components/race/RaceTrack'
import RaceResult from '@/components/race/RaceResult'
import useRace, {
  type Difficulty,
  type JoinFailure,
  type Room,
  type RoomPreview,
  type TimerOption,
} from '@/hooks/useRace'
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
    peekRoom,
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
  // Set when someone tries to open a room without saying who they are.
  const [nameMissing, setNameMissing] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  // A code that checked out, waiting on the joiner's name.
  const [invite, setInvite] = useState<RoomPreview | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [rematchError, setRematchError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // The last finished race. Kept for whoever is still reading it after the
  // other player has pressed Rematch, which resets the room underneath them.
  const [lastResult, setLastResult] = useState<Room | null>(null)
  const opponentWasConnected = useRef<boolean | null>(null)

  useEffect(() => {
    if (!room) setLastResult(null)
    else if (room.status === 'finished') setLastResult(room)
    else if (room.status === 'countdown') setLastResult(null)
  }, [room])

  // A disconnect is worth telling the other player about, but not worth
  // stopping their race for — the clock keeps running and so do they.
  //
  // Tracked as "whoever is not you" rather than by socket id: a player who
  // reconnects comes back under a new id, and that is a return, not a stranger.
  useEffect(() => {
    if (!room || !you) {
      opponentWasConnected.current = null
      return
    }
    const opponent = Object.values(room.players).find((p) => p.id !== you)
    const was = opponentWasConnected.current
    if (opponent && was === true && !opponent.connected) setToast(`${opponent.name} disconnected`)
    if (opponent && was === false && opponent.connected) setToast(`${opponent.name} is back`)
    opponentWasConnected.current = opponent ? opponent.connected : null
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
    // Both players race under a name they chose. A blank one used to become
    // "Player", which tells the other side nothing.
    if (!name.trim()) {
      setNameMissing(true)
      nameRef.current?.focus()
      return
    }
    setBusy(true)
    setJoinError(null)
    await createRoom(name, difficulty, timer)
    setBusy(false)
  }

  // The code is checked before anything else is asked, so a mistyped one fails
  // at once. Only then is the joiner asked who they are.
  const handleCheckCode = async () => {
    setBusy(true)
    setJoinError(null)
    const answer = await peekRoom(code.trim())
    setBusy(false)
    if (typeof answer === 'string') setJoinError(JOIN_MESSAGES[answer])
    else setInvite(answer)
  }

  const handleJoin = async () => {
    if (!invite) return
    setBusy(true)
    setJoinError(null)
    const failure = await joinRoom(invite.code, name)
    setBusy(false)
    if (failure) setJoinError(JOIN_MESSAGES[failure])
    else setInvite(null)
  }

  const handleBackToCode = () => {
    setInvite(null)
    setJoinError(null)
  }

  // Stays in the room: nobody wants to re-share a code to play again. It takes
  // this player back to the ready gate; the other follows when they press it.
  const handleRematch = useCallback(async () => {
    if (!room) return
    setRematchError(null)
    const failure = await requestRematch(room.code)
    if (failure === 'opponent-left') setRematchError('Your opponent has left the room.')
    // Pressed twice, or pressed just as the room moved on — nothing to report.
    else if (failure && failure !== 'already-starting' && failure !== 'not-finished') {
      setRematchError('Could not start a rematch.')
    }
  }, [room, requestRematch])

  const handleLeave = useCallback(() => {
    leave()
    setCode('')
    setInvite(null)
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

  // A player stays on the result until they press Rematch themselves, even
  // once the other player has reset the room and gone back to the lobby.
  const onResult =
    phase === 'finished' || (phase === 'waiting' && Boolean(me && !me.inLobby && lastResult))
  const resultRoom = phase === 'finished' ? room : lastResult
  // The opponent reset the room for a rematch and then walked away from it.
  const opponentWalked = phase === 'waiting' && onResult && (!them || !them.connected)
  // Two seats filled, both back, not started: that is the ready gate.
  const atGate = phase === 'waiting' && seated.length === 2 && !onResult

  // An error from one result screen must not greet the player on the next.
  useEffect(() => {
    if (!onResult) setRematchError(null)
  }, [onResult])

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

      {room && !connected ? (
        <div className="tt-race-toast is-sticky" role="status" aria-live="polite">
          Reconnecting&hellip;
        </div>
      ) : (
        toast && (
          <div className="tt-race-toast" role="status" aria-live="polite">
            {toast}
          </div>
        )
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
      {!room && !invite && (
        <>
        <div className="tt-stage is-mid tt-race-setup">
          <div className="tt-race-split">
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
                  ref={nameRef}
                  className={cn('tt-namefield', nameMissing && 'is-missing')}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.slice(0, NAME_MAX))
                    setNameMissing(false)
                  }}
                  placeholder="Ramu"
                  maxLength={NAME_MAX}
                  autoComplete="off"
                  aria-invalid={nameMissing}
                  aria-describedby={nameMissing ? 'race-name-note' : undefined}
                />
                {nameMissing && (
                  <p id="race-name-note" className="tt-field-note">
                    Add your name to create a room.
                  </p>
                )}
              </div>

              <div className="tt-set">
                <label>How long</label>
                {/* One tray per setting, with a plate that slides to the chosen key. */}
                <div
                  className="tt-keyrow"
                  style={{ '--i': [1, 2, 5].indexOf(timer) } as React.CSSProperties}
                >
                  <i className="tt-keyplate" aria-hidden="true" />
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
                <div
                  className="tt-keyrow"
                  style={{ '--i': LEVELS.findIndex((level) => level.id === difficulty) } as React.CSSProperties}
                >
                  <i className="tt-keyplate" aria-hidden="true" />
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
                  {/* A form, so Enter in the code field joins like the button does. */}
                  <form
                    className="tt-join"
                    onSubmit={(event) => {
                      event.preventDefault()
                      if (connected && !busy && code.length === 6) void handleCheckCode()
                    }}
                  >
                    <input
                      className="tt-code-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      inputMode="numeric"
                      enterKeyHint="go"
                      autoComplete="off"
                      aria-label="Room code"
                    />
                    <button
                      type="submit"
                      className="tt-btn tt-btn-quiet"
                      disabled={!connected || busy || code.length < 6}
                    >
                      Join
                    </button>
                  </form>
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
                    <span className="tt-in-gap is-theirs typing-char-upcoming"> have always accepted </span>
                    <span className="tt-opp-here typing-char-upcoming">p</span>
                    <span className="typing-char-upcoming">eriodic destruction in exchange</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Below the fold, and only on the setup screen — a race in progress must
            not have prose sitting under it. Google called this page a soft 404 on
            24 September: 47 words, nearly all of them button labels, plus an error
            line whenever a crawl caught the server asleep. This is the treatment
            /test got, and /test indexed without complaint. */}
        <section className="mx-auto w-full max-w-2xl px-6 pb-16 pt-4 text-left sm:px-10">
          <h2 className="text-lg font-semibold">How a race works</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            One of you creates a room and gets a six-digit code. The other types it in. That is the
            whole setup — no account, no link to share, nothing to install.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Both of you then get the same passage and the same clock, so the result means
            something: you are not comparing two different texts typed for two different lengths.
            Choose one, two or five minutes, and easy, medium or hard.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            While you type you can see where the other person has reached. Their caret moves
            through the same line as yours, so you know whether you are a word ahead or a word
            behind without looking away from what you are typing.
          </p>

          <h2 className="mt-8 text-lg font-semibold">What gets counted</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The same as a solo test. Words per minute is the characters you got right, divided by
            five, divided by the minutes elapsed. Accuracy is the share of everything you typed
            that was correct. A mistake costs you twice over: it earns nothing, and it still took
            time.
          </p>

          <h2 className="mt-8 text-lg font-semibold">If it takes a moment to connect</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The race server sleeps when nobody is using it, so the first race after a quiet spell
            can take a few seconds to wake up. If it does not connect straight away, wait a moment
            and try again, or{' '}
            <Link to="/start" className="text-primary hover:underline">
              take a solo test
            </Link>{' '}
            meanwhile.
          </p>
        </section>
        </>
      )}

      {/* ---------------- joining: the code checked out, now who are you ---------------- */}
      {!room && invite && (
        <div className="tt-stage is-mid tt-race-setup">
          <form
            className="tt-invite"
            onSubmit={(event) => {
              event.preventDefault()
              if (connected && !busy && name.trim()) void handleJoin()
            }}
          >
            <div className="tt-step-top">
              <button type="button" className="tt-step-back" onClick={handleBackToCode}>
                <ArrowLeft aria-hidden="true" />
                Back
              </button>
            </div>

            <p className="tt-race-eyebrow">
              Room {invite.code} &middot; {invite.timer} min &middot; {invite.difficulty}
            </p>
            <h1 className="mt-3.5">{invite.opponent} is waiting.</h1>

            <div className="tt-invite-keys" aria-hidden="true">
              <span className="tt-namekey is-them">{invite.opponent}</span>
              <span className="tt-invite-vs">vs</span>
              <span className="tt-namekey is-you">{name.trim() || 'You'}</span>
            </div>

            <div className="tt-set">
              <label htmlFor="race-join-name">Your name</label>
              <input
                id="race-join-name"
                className="tt-namefield"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                placeholder="Ramu"
                maxLength={NAME_MAX}
                autoComplete="off"
                enterKeyHint="go"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="tt-btn tt-btn-primary tt-invite-go"
              disabled={!connected || busy || !name.trim()}
            >
              Join the race
            </button>

            {joinError && <div className="tt-race-error">{joinError}</div>}
          </form>
        </div>
      )}

      {/* ---------------- waiting for a second player ---------------- */}
      {room && phase === 'waiting' && !atGate && !onResult && (
        <div className="tt-stage is-mid tt-race-lobby text-center">
          {/* The header's Leave does the same, but up there it is easy to miss. */}
          <div className="tt-step-top">
            <button type="button" className="tt-step-back" onClick={handleLeave}>
              <ArrowLeft aria-hidden="true" />
              Back
            </button>
          </div>
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
                  <span
                    className={cn(
                      'tt-state',
                      !player.connected || !player.inLobby
                        ? 'is-away'
                        : player.ready
                          ? 'is-ready'
                          : 'is-waiting'
                    )}
                  >
                    {player.connected && player.inLobby && player.ready && <i className="tt-dot" />}
                    {!player.connected
                      ? 'AWAY'
                      : !player.inLobby
                        ? 'NOT BACK YET'
                        : player.ready
                          ? 'READY'
                          : 'NOT READY'}
                  </span>
                </div>
              ) : null
            )}
          </div>

          <p className="tt-race-sub">
            {them && !them.connected
              ? `${them.name} dropped out. Their seat is held for two minutes in case they come back.`
              : them && !them.inLobby
                ? `${them.name} is still looking at the results. The countdown starts when you are both ready.`
                : me?.ready
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
            <button type="button" className="tt-btn tt-btn-quiet" onClick={handleLeave}>
              Leave
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

      {/* One slot for the result, whether the room is still finished or has
          been reset by the other player, so it is not torn down and replayed. */}
      {room && you && onResult && resultRoom && (
        <RaceResult
          room={resultRoom}
          you={you}
          onRematch={handleRematch}
          rematchError={rematchError ?? (opponentWalked ? 'Your opponent has left the room.' : null)}
          rematchFrom={phase === 'waiting' && them?.inLobby ? them.name : null}
          rematchDisabled={opponentWalked}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}

export default RacePage
