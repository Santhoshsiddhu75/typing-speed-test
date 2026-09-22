import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import FloatingKeys, { RACE_KEYS } from '@/components/landing/FloatingKeys'

/**
 * Two real passages from the medium library, run together the way a race joins
 * them. Not filler: what the preview types is what a race hands you.
 */
const PASSAGE =
  'Public libraries began as private collections that wealthy owners opened to a handful of scholars. The idea of free access for everyone arrived slowly, pushed by campaigners who argued that education should never depend on income. Modern branches lend far more than books, offering meeting rooms, internet access and language classes. ' +
  'The bicycle changed ordinary life faster than almost any invention before it. Suddenly a factory worker could live several miles from the job, visit relatives in the next village, or simply travel for pleasure.'

/** A real one-minute race, 1:00 down to 0:00. */
const RACE_MS = 60_000
/** A beat on 0:00 before the next race starts, so the finish registers. */
const HOLD_MS = 1_500
const TICK_MS = 100

/**
 * Characters per second through each third of the minute. Suresh starts quicker
 * and fades; Ramesh builds and overtakes in the last few seconds, so the lead
 * changes hands once a loop, and with it the arrow, the count and the colour.
 * Both finish around 70 WPM: a believable pair rather than a showcase.
 */
const PACE = {
  ramesh: [5.0, 5.8, 6.8],
  suresh: [6.2, 5.9, 5.0],
}

/** What people who ask for less motion see: late in the race, Suresh two words up. */
const STILL_MS = 48_000

/** Characters typed by `ms` into the race. */
function reached(pace: number[], ms: number): number {
  const seconds = Math.min(ms, RACE_MS) / 1000
  let chars = 0
  pace.forEach((perSecond, third) => {
    const from = third * 20
    const upTo = Math.min(seconds, from + 20)
    if (upTo > from) chars += (upTo - from) * perSecond
  })
  return Math.min(PASSAGE.length, Math.floor(chars))
}

/** Words lying between two positions: the lead, counted the way the race counts it. */
function wordsBetween(from: number, to: number): number {
  const slice = PASSAGE.slice(from, to).trim()
  return slice ? slice.split(/\s+/).length : 0
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** How much of the line shows either side of the caret. The lane clips the rest. */
const BEHIND = 48
const AHEAD = 64

/**
 * The race screen in miniature, running on its own: the clock, the one line
 * with the caret held in the middle, the opponent's arrow, the lead and both
 * speeds. Drawn from the same rules as the real race, not a recording of it.
 */
function RacePreview() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [ms, setMs] = useState(() => (prefersReducedMotion() ? STILL_MS : 0))

  useEffect(() => {
    if (prefersReducedMotion()) return

    // Runs only while it is on screen: a loop nobody is looking at is battery
    // spent for nothing, on the phones most visitors arrive on.
    let visible = true
    let last = Date.now()
    const root = rootRef.current
    const observer =
      root && typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            last = Date.now()
          })
        : null
    if (observer && root) observer.observe(root)

    const id = window.setInterval(() => {
      const now = Date.now()
      // Date.now rather than performance.now, because every engine lets a test
      // control it. A throttled background tab can hand back one long step and a
      // clock set backwards a negative one; neither may move the race by it.
      const step = Math.max(0, Math.min(now - last, 250))
      last = now
      if (!visible || document.hidden) return
      setMs((current) => (current + step >= RACE_MS + HOLD_MS ? 0 : current + step))
    }, TICK_MS)

    return () => {
      window.clearInterval(id)
      observer?.disconnect()
    }
  }, [])

  const mine = reached(PACE.ramesh, ms)
  const theirs = reached(PACE.suresh, ms)
  const seconds = Math.max(0, Math.ceil((RACE_MS - ms) / 1000))
  const minutes = Math.min(ms, RACE_MS) / 60_000
  // Too early to say: a speed worked out from a second of typing swings wildly.
  const wpm = (chars: number) => (ms < 2000 ? 0 : Math.round(chars / 5 / minutes))

  const apart = mine !== theirs
  const theyLead = theirs > mine
  const lo = Math.min(mine, theirs)
  const hi = Math.max(mine, theirs)
  const lead = apart ? wordsBetween(lo, hi) : 0
  const gap = cn('tt-lr-gap', theyLead ? 'is-theirs' : 'is-yours')

  const piece = (from: number, to: number, className?: string): ReactNode =>
    from < to ? (
      <span key={`${from}-${className ?? ''}`} className={className}>
        {PASSAGE.slice(from, to)}
      </span>
    ) : null

  // Left of the caret: what Ramesh has typed. When he leads, Suresh's arrow and
  // the stretch between them sit here.
  const leftFrom = Math.max(0, mine - BEHIND)
  const left: ReactNode[] =
    apart && !theyLead && theirs >= leftFrom
      ? [
          piece(leftFrom, theirs),
          piece(theirs, theirs + 1, cn(gap, 'tt-lr-opp')),
          piece(theirs + 1, mine, gap),
        ]
      : [piece(leftFrom, mine, apart && !theyLead ? gap : undefined)]

  // From the caret on: what is still to come. When Suresh leads, his arrow and
  // the stretch between them sit here.
  const rightTo = Math.min(PASSAGE.length, mine + AHEAD)
  const right: ReactNode[] =
    theyLead && theirs < rightTo
      ? [
          piece(mine, mine + 1, cn('tt-lr-caret', gap)),
          piece(mine + 1, theirs, gap),
          piece(theirs, theirs + 1, 'tt-lr-opp'),
          piece(theirs + 1, rightTo),
        ]
      : [piece(mine, mine + 1, 'tt-lr-caret'), piece(mine + 1, rightTo)]

  return (
    <div ref={rootRef} className="tt-lr-race" aria-hidden="true">
      <div className="tt-lr-clock">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        <small>Remaining</small>
      </div>

      <div className="tt-lr-lane">
        <div className="tt-lr-typed">{left}</div>
        <div className="tt-lr-next">{right}</div>
      </div>

      <div className="tt-lr-standing">
        <span className={!lead ? 'is-level' : theyLead ? 'is-behind' : 'is-ahead'}>
          <i />
          {!lead
            ? 'Neck and neck'
            : `${theyLead ? 'Suresh' : 'Ramesh'} is ${lead} ${lead === 1 ? 'word' : 'words'} ahead`}
        </span>
      </div>

      <div className="tt-lr-players">
        <div>
          <div className="tt-lr-who">Ramesh</div>
          <div className="tt-lr-rate is-you">
            {wpm(mine)}
            <em>WPM</em>
          </div>
        </div>
        <div className="text-right">
          <div className="tt-lr-who">Suresh</div>
          <div className="tt-lr-rate is-them">
            {wpm(theirs)}
            <em>WPM</em>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The same three promises the race page makes, so the two agree. */
const CLAIMS = ['Same passage', 'Same timer', 'See them word by word']

/**
 * The race, introduced under the hero: what it is in three lines, the thing
 * itself running beside them, and the way in.
 */
export const RaceSection: React.FC = () => {

  // Full width, so its keycaps sit against the screen's edges like the hero's,
  // with the centred card over them.
  return (
    <section className="relative" aria-labelledby="race-promo-title">
      <FloatingKeys keys={RACE_KEYS} />

      <div className="tt-lr">
        <div className="tt-lr-card">
          <div className="tt-lr-text">
            <p className="tt-kicker mb-3 sm:mb-[18px]">Head to head</p>
            <h2 id="race-promo-title">Race a friend.</h2>
            <div className="tt-lr-ticks">
              {CLAIMS.map((claim) => (
                <span key={claim} className="tt-lr-tick">
                  <Check aria-hidden="true" />
                  {claim}
                </span>
              ))}
            </div>
          </div>

          <div className="tt-lr-show">
            <RacePreview />
          </div>

          <div className="tt-lr-cta">
            <Link to="/race" className="tt-btn tt-btn-primary">
              Race a friend
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="tt-lr-note">Send a six-digit code. No account needed.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default RaceSection
