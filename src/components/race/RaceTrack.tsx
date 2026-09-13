import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getRandomText } from '@/data/texts'
import { cn } from '@/lib/utils'
import { useTypingField } from '@/hooks/useTypingField'
import type { Room } from '@/hooks/useRace'

interface RaceTrackProps {
  room: Room
  you: string
  serverNow: () => number
  onProgress: (progress: number, wpm: number, accuracy: number) => void
  onFinish: (wpm: number, accuracy: number) => void
}

const PROGRESS_EVERY_MS = 350

/** Words lying between two positions in the passage — the lead, counted. */
function wordsBetween(text: string, from: number, to: number): number {
  if (to <= from) return 0
  const slice = text.slice(from, to).trim()
  return slice ? slice.split(/\s+/).length : 0
}

/**
 * The passage is rendered in fixed-size chunks rather than as one list of
 * spans. A one-minute passage is around 1,500 characters, and re-rendering
 * every one of them on every keystroke measured at 70 chars/sec on a desktop
 * — fast enough for a person, but the same work on a mid-range phone is not,
 * and it starved the clock interval badly enough that it stopped ticking.
 *
 * A chunk only re-renders when its own slice of the state moves: the text it
 * holds, what has been typed inside it, and whether the caret, the lead or
 * the opponent marker fall within it. Typing advances one chunk at a time, so
 * a keystroke now touches one or two of them instead of all twenty-six.
 */
const CHUNK = 60

interface ChunkProps {
  text: string
  /** What the player has typed within this chunk, for the correct/incorrect marks. */
  typedHere: string
  /** Caret offset inside the chunk, or -1. */
  caretAt: number
  /** The lead, clamped to this chunk. Both -1 when it does not reach here. */
  gapFrom: number
  gapTo: number
  /** True when the lead belongs to the player rather than the opponent. */
  gapMine: boolean
  /** Opponent marker offset inside the chunk, or -1. */
  oppAt: number
}

const PassageChunk = memo(function PassageChunk({
  text,
  typedHere,
  caretAt,
  gapFrom,
  gapTo,
  gapMine,
  oppAt,
}: ChunkProps) {
  return (
    <>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className={cn(
            'typing-char',
            i < typedHere.length &&
              (typedHere[i] === char ? 'typing-char-correct' : 'typing-char-incorrect'),
            i === caretAt && 'typing-char-current',
            i > caretAt && caretAt >= 0 && 'typing-char-upcoming',
            caretAt < 0 && i >= typedHere.length && 'typing-char-upcoming',
            i >= gapFrom && i < gapTo && gapFrom >= 0 && 'tt-in-gap',
            i >= gapFrom && i < gapTo && gapFrom >= 0 && (gapMine ? 'is-yours' : 'is-theirs'),
            i === oppAt && 'tt-opp-here'
          )}
        >
          {char}
        </span>
      ))}
    </>
  )
})

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

  const chunks = useMemo(() => {
    const out: string[] = []
    for (let i = 0; i < text.length; i += CHUNK) out.push(text.slice(i, i + CHUNK))
    return out
  }, [text])

  const trackRef = useRef<HTMLDivElement>(null)
  const lastSent = useRef(0)
  const finished = useRef(false)

  const [typed, setTyped] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(room.timer * 60)
  const [markerOffScreen, setMarkerOffScreen] = useState(false)

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

  const me = room.players[you]

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

  // ---- where each of you is, and what sits between ----
  const mine = typed.length
  const theirs = opponent ? Math.round(opponent.progress * text.length) : 0
  const theyAreHere = Boolean(opponent && opponent.connected && theirs !== mine)
  const lo = Math.min(mine, theirs)
  const hi = Math.max(mine, theirs)
  const gapWords = theyAreHere ? wordsBetween(text, lo, hi) : 0
  const iLead = mine > theirs
  const gone = Boolean(opponent && !opponent.connected && !opponent.finished)

  // Their marker can scroll out of the panel entirely when the gap is large.
  useEffect(() => {
    const panel = trackRef.current
    const marker = panel?.querySelector('.tt-opp-here')
    if (!panel || !marker) {
      setMarkerOffScreen(false)
      return
    }
    const panelBox = panel.getBoundingClientRect()
    const markerBox = marker.getBoundingClientRect()
    setMarkerOffScreen(markerBox.top > panelBox.bottom || markerBox.bottom < panelBox.top)
  }, [mine, theirs, text])

  return (
    <div className="tt-stage">
      <div className="tt-head">
        <div className="tt-side-you">
          <div className="tt-who">{me?.name ?? 'You'}</div>
          <div className="tt-rate">
            {wpm}
            <em>WPM</em>
          </div>
        </div>

        <div className="tt-race-clock">
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          <small>Remaining</small>
        </div>

        <div className={cn('tt-side-them', gone && 'tt-gone')}>
          <div className="tt-who">
            {opponent?.name ?? 'Opponent'}
            {gone && <em className="tt-gone-tag">left</em>}
          </div>
          <div className="tt-rate">
            {opponent?.wpm ?? 0}
            <em>WPM</em>
          </div>
        </div>
      </div>

      <div className="tt-standing">
        {gapWords > 0 ? (
          <span className={iLead ? 'is-ahead' : 'is-behind'}>
            <i className="tt-dot" />
            {iLead
              ? `You are ${gapWords} ${gapWords === 1 ? 'word' : 'words'} ahead`
              : `${opponent?.name ?? 'They'} is ${gapWords} ${gapWords === 1 ? 'word' : 'words'} ahead`}
          </span>
        ) : (
          <span className="is-level">
            <i className="tt-dot" />
            Neck and neck
          </span>
        )}
      </div>

      <div
        ref={trackRef}
        className="tt-panel tt-race-text cursor-text"
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
          {chunks.map((slice, index) => {
            const start = index * CHUNK
            const end = start + slice.length
            return (
              <PassageChunk
                key={index}
                text={slice}
                typedHere={typed.slice(start, end)}
                caretAt={mine >= start && mine < end ? mine - start : -1}
                gapFrom={theyAreHere && hi > start && lo < end ? Math.max(0, lo - start) : -1}
                gapTo={theyAreHere && hi > start && lo < end ? Math.min(slice.length, hi - start) : -1}
                gapMine={iLead}
                oppAt={theyAreHere && theirs >= start && theirs < end ? theirs - start : -1}
              />
            )
          })}
        </p>

        {markerOffScreen && !iLead && (
          <div className="tt-offscreen">{(opponent?.name ?? 'They').toUpperCase()} &darr;</div>
        )}
      </div>
    </div>
  )
}

export default RaceTrack
