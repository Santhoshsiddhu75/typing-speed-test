import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

  const blockRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLParagraphElement>(null)
  const shift = useRef(0)
  const lastSent = useRef(0)
  // A progress send held back by the throttle, and what it should carry.
  const pendingSend = useRef<number | null>(null)
  const latestSent = useRef({ length: 0, wpm: 0, accuracy: 100 })
  const finished = useRef(false)
  // What this player finished on, and which seat id already reported it.
  const finalRef = useRef<{ wpm: number; accuracy: number } | null>(null)
  const reportedAs = useRef<string | null>(null)

  const [typed, setTyped] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(room.timer * 60)
  // Which end of the line the opponent has run past, if either.
  const [edge, setEdge] = useState<'left' | 'right' | null>(null)
  // Bumped when the screen or the font changes, so the line is placed again.
  const [layoutPass, setLayoutPass] = useState(0)

  // The clock, the line, the lead and both names sit together under the
  // header, so on a phone that block is what gets scrolled to the top once the
  // keyboard opens. holdFocus is on here but not on the landing demo: mid-race
  // a stray tap that dismisses the keyboard would cost you the run.
  const { inputRef, isMobile, focusField, blurField, scrollFieldIntoView, focusHandlers } =
    useTypingField({ scrollTargetRef: blockRef, enabled: true, holdFocus: true })

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

  // ---- where each of you is, and what sits between ----
  const mine = typed.length
  const theirs = opponent ? Math.round(opponent.progress * text.length) : 0
  const theyAreHere = Boolean(opponent && opponent.connected && theirs !== mine)
  const lo = Math.min(mine, theirs)
  const hi = Math.max(mine, theirs)
  const gapWords = theyAreHere ? wordsBetween(text, lo, hi) : 0
  const iLead = mine > theirs
  const gone = Boolean(opponent && !opponent.connected && !opponent.finished)
  const theirName = (opponent?.name ?? 'Them').toUpperCase()

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    finalRef.current = { wpm, accuracy }
    reportedAs.current = you
    // Land the final position before the final numbers.
    if (pendingSend.current !== null) {
      window.clearTimeout(pendingSend.current)
      pendingSend.current = null
      const latest = latestSent.current
      onProgress(Math.min(1, latest.length / text.length), latest.wpm, latest.accuracy)
    }
    if (isMobile) blurField()
    onFinish(wpm, accuracy)
  }, [onFinish, onProgress, text, wpm, accuracy, isMobile, blurField, you])

  // A finish sent while the connection was down went out under the old socket
  // and was ignored. Once the seat is reclaimed under a new id, report it again.
  useEffect(() => {
    const final = finalRef.current
    if (!final || reportedAs.current === you) return
    const seat = room.players[you]
    if (room.status !== 'racing' || !seat || seat.finished) return
    reportedAs.current = you
    onFinish(final.wpm, final.accuracy)
  }, [you, room, onFinish])

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

  useEffect(() => {
    let live = true
    const again = () => {
      if (live) setLayoutPass((n) => n + 1)
    }
    document.fonts?.ready.then(again)
    window.addEventListener('resize', again)
    return () => {
      live = false
      window.removeEventListener('resize', again)
    }
  }, [])

  // The line is placed from where the caret character actually is on the page,
  // not from characters × a measured width. On phones the passage font is
  // forced to 16px by !important rules shared with the solo test, so a width
  // measured anywhere else came out about a pixel too wide per character, and
  // the caret crept left until the word being typed slid off the screen.
  // Positions are taken relative to the line itself, so the slide already
  // applied, or halfway through its transition, cancels out.
  useLayoutEffect(() => {
    const line = lineRef.current
    const view = windowRef.current
    if (!line || !view) return

    // Where overflow: clip is unsupported the clipped boxes can still be
    // scrolled sideways by the browser; undo that before placing the line.
    view.scrollLeft = 0
    if (view.parentElement) view.parentElement.scrollLeft = 0

    const lineLeft = line.getBoundingClientRect().left
    const width = view.clientWidth
    const inset = line.offsetLeft
    const place = (el: Element | null) => {
      if (!el) return null
      const box = el.getBoundingClientRect()
      return { left: box.left - lineLeft, width: box.width }
    }

    // Your caret holds the middle. Until it gets there the text starts at the
    // left, as on the solo test. Past the last character it stays put.
    const caret = place(line.querySelector('.typing-char-current'))
    if (caret) shift.current = Math.min(0, width / 2 - inset - (caret.left + caret.width / 2))
    line.style.transform = `translateX(${shift.current}px)`

    // Their arrow can sit past either end of the line. Then their name stands
    // at that edge, pointing the way.
    const marker = theyAreHere ? place(line.querySelector('.tt-opp-here')) : null
    const at = marker ? inset + marker.left + shift.current : 0
    setEdge(!marker ? null : at + marker.width > width ? 'right' : at < 0 ? 'left' : null)
  }, [mine, theirs, theyAreHere, text, layoutPass])

  // Progress goes out at most every PROGRESS_EVERY_MS, but a keystroke that
  // lands inside that window is sent when the window closes rather than
  // dropped. Otherwise a player who pauses leaves the opponent looking at a
  // position a few characters out of date until they type again.
  const sendProgressNow = () => {
    if (pendingSend.current !== null) {
      window.clearTimeout(pendingSend.current)
      pendingSend.current = null
    }
    lastSent.current = Date.now()
    const latest = latestSent.current
    onProgress(Math.min(1, latest.length / text.length), latest.wpm, latest.accuracy)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (finished.current) return

    const value = event.target.value.slice(0, text.length)
    setTyped(value)
    latestSent.current = { length: value.length, wpm, accuracy }

    const since = Date.now() - lastSent.current
    if (since > PROGRESS_EVERY_MS) sendProgressNow()
    else if (pendingSend.current === null) {
      pendingSend.current = window.setTimeout(sendProgressNow, PROGRESS_EVERY_MS - since)
    }

    if (value.length >= text.length) finish()
  }

  useEffect(
    () => () => {
      if (pendingSend.current !== null) window.clearTimeout(pendingSend.current)
    },
    []
  )

  return (
    <div className="tt-stage tt-race-stage">
      {/* The clock above the line; the lead and both players under it, where
          the screen used to stand empty. */}
      <div ref={blockRef}>
        <div className="tt-race-clock">
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          <small>Remaining</small>
        </div>

        <div className="tt-panel tt-race-text cursor-text" onClick={focusField}>
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
          <div ref={windowRef} className="tt-lane-window">
            <p ref={lineRef} className="typing-text">
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

            {edge && (
              <span className={cn('tt-edge', `is-${edge}`)}>
                {edge === 'left' ? `‹ ${theirName}` : `${theirName} ›`}
              </span>
            )}
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

        <div className="tt-players">
          <div className="tt-side-you">
            <div className="tt-who">{me?.name ?? 'You'}</div>
            <div className="tt-rate">
              {wpm}
              <em>WPM</em>
            </div>
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
      </div>
    </div>
  )
}

export default RaceTrack
