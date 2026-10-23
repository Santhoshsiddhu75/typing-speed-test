import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The opening words of the first eight passages at each level, copied from
 * src/data/passages rather than imported: the whole library would land in the
 * landing page's bundle for the sake of 24 lines. If the passages change,
 * change these, and the 120 and forty in the copy below (40 a level today).
 */
const ROWS = [
  {
    level: 'Easy',
    tone: 'is-easy',
    lines: [
      'The rain started just after lunch.',
      'My dog waits by the door every morning.',
      'The bread takes all morning but the work is simple.',
      'There is an old apple tree at the end of the field.',
      'She keeps her tools in a wooden box',
      'The bus comes at ten past seven.',
      'We swim early, before the beach fills up.',
      'The kitchen smells of onions and warm oil.',
    ],
  },
  {
    level: 'Medium',
    tone: 'is-medium',
    lines: [
      'Public libraries began as private collections',
      'The bicycle changed ordinary life faster than almost',
      'Coffee reached Europe through the trading ports',
      'Suspension bridges work by turning the weight of',
      'Movable type did not simply speed up copying',
      'Early mapmakers filled unknown regions with decoration',
      'Weather forecasting improved dramatically once observations',
      'Museums originally displayed objects to demonstrate',
    ],
  },
  {
    level: 'Hard',
    tone: 'is-hard',
    lines: [
      'Distributed systems must reconcile consistency against availability',
      'Adaptive immunity depends on generating enormous receptor diversity',
      'Quantum measurement remains philosophically contested',
      'Cryptographic security rests on computational difficulty',
      'Climate models represent atmospheric circulation on grids',
      'Genome sequencing generates data far faster than interpretation',
      'Materials scientists increasingly design microstructure',
      'Epidemiological inference must continuously distinguish correlation',
    ],
  },
]

/** A line that ends a sentence keeps its full stop; the rest trail off. */
const opening = (line: string) => (line.endsWith('.') ? line : `${line}…`)

export interface PassagesHandle {
  /** Scrolls the section into view. */
  scrollIntoView: () => void
}

/**
 * What you will be typing: a strip of real passage openings for each level,
 * drifting past at their own speeds. It stands where a typed demo used to,
 * which looked too much like the race card above it.
 */
export const PassagesSection = forwardRef<PassagesHandle>((_props, ref) => {
  const sectionRef = useRef<HTMLElement>(null)
  const [playing, setPlaying] = useState(false)

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
          lands exactly where it started and the loop has no seam. */}
      <div className="tt-shelf-rows" aria-hidden="true">
        {ROWS.map((row) => (
          <div key={row.level} className="tt-shelf-row">
            <div className="tt-shelf-track">
              {[...row.lines, ...row.lines].map((line, index) => (
                <div key={index} className="tt-shelf-card">
                  <span className={cn('tt-shelf-level', row.tone)}>{row.level}</span>
                  <p>{opening(line)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
