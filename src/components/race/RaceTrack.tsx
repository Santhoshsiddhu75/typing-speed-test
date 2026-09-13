import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getRandomText } from '@/data/texts'
import { cn } from '@/lib/utils'
import { useTypingField } from '@/hooks/useTypingField'
import type { RacePlayer, Room } from '@/hooks/useRace'

interface RaceTrackProps {
  room: Room
  you: string
  serverNow: () => number
  onProgress: (progress: number, wpm: number, accuracy: number) => void
  onFinish: (wpm: number, accuracy: number) => void
}

const PROGRESS_EVERY_MS = 350

export const RaceTrack: React.FC<RaceTrackProps> = ({
  room,
  you,
  serverNow,
  onProgress,
  onFinish,
}) => {
  // Built from the seed, so this is the same text the opponent is typing.
  const text = useMemo(
    () => getRandomText(room.difficulty, room.timer, room.seed),
    [room.difficulty, room.timer, room.seed]
  )

  const trackRef = useRef<HTMLDivElement>(null)
  const lastSent = useRef(0)
  const finished = useRef(false)

  const [typed, setTyped] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(room.timer * 60)

  // holdFocus is on here but not on the landing demo: mid-race a stray tap
  // that dismisses the keyboard would cost you the run while the clock runs on.
  const { inputRef, isMobile, focusField, blurField, scrollFieldIntoView, focusHandlers } =
    useTypingField({ scrollTargetRef: trackRef, enabled: true, holdFocus: true })

  const opponent = Object.values(room.players).find((p) => p.id !== you)

  let correct = 0
  for (let i = 0; i < typed.length; i += 1) {
    if (typed[i] === text[i]) correct += 1
  }

  const elapsedMs = room.startAt ? Math.max(0, serverNow() - room.startAt) : 0
  const minutes = elapsedMs / 60000
  const wpm = minutes > 0 ? Math.round(correct / 5 / minutes) : 0
  const accuracy = typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100

  // Your own lane reads from local state, not from the room. The server only
  // relays progress to the OTHER player, so waiting for it to come back would
  // leave your own bar frozen at zero — and a round trip is a silly way to
  // learn something this tab already knows.
  const me = {
    ...room.players[you],
    progress: Math.min(1, typed.length / text.length),
    wpm,
    accuracy,
  }

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    if (isMobile) blurField()
    onFinish(wpm, accuracy)
  }, [onFinish, wpm, accuracy, isMobile, blurField])

  // The race ends on the server's clock, not on however long this tab has
  // been open, so both players stop at the same instant.
  useEffect(() => {
    if (!room.endAt) return

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((room.endAt! - serverNow()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) finish()
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [room.endAt, serverNow, finish])

  useEffect(() => {
    focusField()
    scrollFieldIntoView()
  }, [focusField, scrollFieldIntoView])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (finished.current) return

    const value = event.target.value.slice(0, text.length)
    setTyped(value)

    const now = Date.now()
    if (now - lastSent.current > PROGRESS_EVERY_MS) {
      lastSent.current = now
      onProgress(Math.min(1, value.length / text.length), wpm, accuracy)
    }

    if (value.length >= text.length) finish()
  }

  // Keep the caret roughly in view as the text scrolls past.
  useEffect(() => {
    const el = trackRef.current?.querySelector('.typing-char-current')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [typed.length])

  return (
    <div className="mx-auto w-full max-w-[900px] px-4">
      <RaceBars me={me} opponent={opponent} secondsLeft={secondsLeft} />

      <div
        ref={trackRef}
        className="tt-race-text relative mt-6 cursor-text"
        onClick={focusField}
      >
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={handleChange}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Type the text shown"
          className="tt-capture-race"
          onFocus={() => {
            focusHandlers.onFocus()
            scrollFieldIntoView()
          }}
          onBlur={focusHandlers.onBlur}
        />
        <p className="typing-text m-0">
          {text.split('').map((char, index) => (
            <span
              key={index}
              className={cn(
                'typing-char',
                index < typed.length &&
                  (typed[index] === char ? 'typing-char-correct' : 'typing-char-incorrect'),
                index === typed.length && 'typing-char-current',
                index > typed.length && 'typing-char-upcoming'
              )}
            >
              {char}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}

const RaceBars: React.FC<{
  me?: RacePlayer
  opponent?: RacePlayer
  secondsLeft: number
}> = ({ me, opponent, secondsLeft }) => (
  <div className="tt-race-bars">
    <Lane player={me} label="You" mine />
    <div className="tt-race-clock tabular-nums">
      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
    </div>
    <Lane player={opponent} label="Opponent" />
  </div>
)

/** Seeing their marker pull ahead of yours is the entire point of a race. */
const Lane: React.FC<{ player?: RacePlayer; label: string; mine?: boolean }> = ({
  player,
  label,
  mine,
}) => (
  <div className={cn('tt-lane', mine && 'is-mine')}>
    <div className="tt-lane-head">
      <span className="tt-lane-name">{player?.name ?? label}</span>
      <span className="tt-lane-wpm tabular-nums">
        {player?.wpm ?? 0} <small>wpm</small>
      </span>
    </div>
    <div className="tt-lane-track">
      <div className="tt-lane-fill" style={{ width: `${Math.round((player?.progress ?? 0) * 100)}%` }} />
    </div>
  </div>
)

export default RaceTrack
