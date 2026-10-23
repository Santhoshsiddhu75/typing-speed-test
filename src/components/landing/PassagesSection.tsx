import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { DifficultyLevel } from '@/types'
import { cn } from '@/lib/utils'

/**
 * The first sentence of the first eight passages at each level, copied from
 * src/data/passages rather than imported: the whole library would land in the
 * landing page's bundle for the sake of 24 lines. If the passages change,
 * change these, and the 120 and forty in the copy below (40 a level today).
 * A card shows the opening (`cut` words of it); the peek shows the sentence.
 */
const ROWS: { level: string; difficulty: DifficultyLevel; tone: string; lines: { full: string; cut?: number }[] }[] = [
  {
    level: 'Easy',
    difficulty: 'easy',
    tone: 'is-easy',
    lines: [
      { full: 'The rain started just after lunch.' },
      { full: 'My dog waits by the door every morning.' },
      { full: 'The bread takes all morning but the work is simple.' },
      { full: 'There is an old apple tree at the end of the field.' },
      { full: 'She keeps her tools in a wooden box under the bench.', cut: 8 },
      { full: 'The bus comes at ten past seven.' },
      { full: 'We swim early, before the beach fills up.' },
      { full: 'The kitchen smells of onions and warm oil.' },
    ],
  },
  {
    level: 'Medium',
    difficulty: 'medium',
    tone: 'is-medium',
    lines: [
      { full: 'Public libraries began as private collections that wealthy owners opened to a handful of scholars.', cut: 6 },
      { full: 'The bicycle changed ordinary life faster than almost any invention before it.', cut: 8 },
      { full: 'Coffee reached Europe through the trading ports of the eastern Mediterranean and met immediate suspicion.', cut: 7 },
      { full: 'Suspension bridges work by turning the weight of the deck into tension along the cables.', cut: 8 },
      { full: 'Movable type did not simply speed up copying, it changed which ideas could travel.', cut: 8 },
      { full: 'Early mapmakers filled unknown regions with decoration rather than admitting ignorance.', cut: 7 },
      { full: 'Weather forecasting improved dramatically once observations could be shared faster than the weather itself travelled.', cut: 6 },
      { full: 'Museums originally displayed objects to demonstrate the wealth and reach of their owners rather than to teach anyone.', cut: 6 },
    ],
  },
  {
    level: 'Hard',
    difficulty: 'hard',
    tone: 'is-hard',
    lines: [
      { full: 'Distributed systems must reconcile consistency against availability whenever network partitions interrupt communication between nodes.', cut: 7 },
      { full: 'Adaptive immunity depends on generating enormous receptor diversity before any pathogen is encountered.', cut: 8 },
      { full: 'Quantum measurement remains philosophically contested despite unambiguous experimental agreement about predicted probabilities.', cut: 5 },
      { full: 'Cryptographic security rests on computational difficulty rather than mathematical impossibility.', cut: 6 },
      { full: 'Climate models represent atmospheric circulation on grids substantially coarser than many meteorologically significant processes.', cut: 7 },
      { full: 'Genome sequencing generates data far faster than interpretation can meaningfully proceed.', cut: 8 },
      { full: 'Materials scientists increasingly design microstructure deliberately rather than accepting whatever solidification produces.', cut: 5 },
      { full: 'Epidemiological inference must continuously distinguish correlation from causation using observational data that experiments could settle directly.', cut: 6 },
    ],
  },
]

/** A card's opening: the whole sentence, or its first `cut` words trailing off. */
const opening = ({ full, cut }: { full: string; cut?: number }) =>
  cut ? `${full.split(' ').slice(0, cut).join(' ').replace(/,$/, '')}…` : full

/** Half the peek's width (.tt-shelf-peek), plus a margin, so it never leaves the strip. */
const PEEK_HALF = 175 + 12

/**
 * Without a mouse, or on a screen too narrow to hold the peek beside its card,
 * the peek opens on a tap instead, in the middle of the screen. Asked at the
 * moment of the tap or the hover, so a window resized since still gets it right.
 */
const tapToPeek = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth < 640 ||
    typeof window.matchMedia !== 'function' ||
    !window.matchMedia('(hover: hover) and (pointer: fine)').matches)

interface Peek {
  row: number
  index: number
  /** The peek's centre within its strip; unused when it opens centred on the screen. */
  x: number
  centred: boolean
}

export interface PassagesHandle {
  /** Scrolls the section into view. */
  scrollIntoView: () => void
}

/**
 * What you will be typing: a strip of real passage openings for each level,
 * drifting past at their own speeds. It stands where a typed demo used to,
 * which looked too much like the race card above it.
 *
 * With a mouse, resting on a card stops its strip and pops up a larger card
 * over it with the whole first sentence. That card is a link straight into a
 * one-minute test at its level. The strip stays still while the pointer is on
 * the card or on the peek, so the pointer can travel from one to the other.
 * On a phone a tap opens the same card in the middle of the screen, over a
 * veil, and a tap anywhere else closes it.
 */
export const PassagesSection = forwardRef<PassagesHandle>((_props, ref) => {
  const sectionRef = useRef<HTMLElement>(null)
  const [playing, setPlaying] = useState(false)
  const [peek, setPeek] = useState<Peek | null>(null)
  const centred = peek?.centred ?? false

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  }))

  // Drifts only while on screen: a loop nobody is looking at is battery spent
  // for nothing, on the phones most visitors arrive on.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (typeof IntersectionObserver !== 'function') {
      setPlaying(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting))
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // A peek opened centred stays until it is dismissed: Escape, as well as a tap
  // on the veil.
  useEffect(() => {
    if (!centred) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setPeek(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [centred])

  // Centred on the card, measured against the strip's wrapper the peek sits in.
  const peekAt = (row: number, index: number, card: HTMLElement) => {
    const wrap = card.closest('.tt-shelf-wrap')
    if (!wrap) return
    const c = card.getBoundingClientRect()
    const w = wrap.getBoundingClientRect()
    const centre = c.left + c.width / 2 - w.left
    setPeek({ row, index, x: Math.min(Math.max(centre, PEEK_HALF), w.width - PEEK_HALF), centred: false })
  }

  const peekCard = (p: Peek) => {
    const row = ROWS[p.row]
    return (
      <Link
        // A new key for each card, so the pop plays again as the pointer
        // moves along the strip.
        key={p.index}
        to={`/test?timer=1&difficulty=${row.difficulty}`}
        className={cn('tt-shelf-peek', p.centred && 'is-centred')}
        style={p.centred ? undefined : { left: p.x }}
        tabIndex={-1}
      >
        <span className={cn('tt-shelf-level', row.tone)}>{row.level}</span>
        <p>{row.lines[p.index % row.lines.length].full}</p>
        <span className="tt-shelf-go">
          Try this level
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    )
  }

  return (
    <section
      ref={sectionRef}
      className={cn('tt-shelf relative py-14 sm:py-[68px]', playing && 'is-playing')}
      aria-labelledby="passages-title"
    >
      <div className="relative z-10 mx-auto max-w-[880px] px-5 text-center sm:px-10">
        <p className="tt-kicker mb-3">Real prose</p>
        <h2
          id="passages-title"
          className="text-balance text-[30px] font-normal leading-tight tracking-tight sm:text-[42px]"
        >
          120 real passages to type.
        </h2>
        <p className="mx-auto mt-3.5 text-pretty text-[15.5px] leading-relaxed text-muted-foreground sm:text-[16.5px]">
          Forty at each level, from easy to hard.
        </p>
      </div>

      {/* Each strip holds its cards twice over, so moving it half its width
          lands exactly where it started and the loop has no seam. The strips
          repeat what the heading says, so they are hidden from screen
          readers, and the peek's link is left out of the tab order with them:
          the Start typing button below is the way in for both. */}
      <div className="tt-shelf-rows" aria-hidden="true">
        {ROWS.map((row, r) => {
          const held = peek?.row === r ? peek : null
          return (
            <div
              key={row.level}
              className="tt-shelf-wrap"
              onMouseLeave={() => setPeek((current) => (current?.centred ? current : null))}
            >
              <div className={cn('tt-shelf-row', held && 'is-held')}>
                <div className="tt-shelf-track">
                  {[...row.lines, ...row.lines].map((line, index) => (
                    <div
                      key={index}
                      className={cn('tt-shelf-card', held?.index === index && 'is-peeked')}
                      onMouseEnter={(event) => !tapToPeek() && peekAt(r, index, event.currentTarget)}
                      onClick={() => tapToPeek() && setPeek({ row: r, index, x: 0, centred: true })}
                    >
                      <span className={cn('tt-shelf-level', row.tone)}>{row.level}</span>
                      <p>{opening(line)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {held && !held.centred && peekCard(held)}
            </div>
          )
        })}
      </div>

      {/* On the body, so nothing on the page can trap or clip it. */}
      {peek?.centred &&
        createPortal(
          <div aria-hidden="true">
            <div className="tt-shelf-veil" onClick={() => setPeek(null)} />
            {peekCard(peek)}
          </div>,
          document.body
        )}

      <div className="relative z-10 mt-7 flex justify-center px-5 sm:mt-[34px]">
        <Link to="/start" className="tt-btn tt-btn-primary">
          Start typing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
})

PassagesSection.displayName = 'PassagesSection'

export default PassagesSection
