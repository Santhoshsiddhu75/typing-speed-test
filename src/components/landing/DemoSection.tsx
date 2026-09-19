import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import FloatingKeys, { DEMO_KEYS } from '@/components/landing/FloatingKeys'

/** Real text from the passage library — the opening of the libraries passage. */
const DEMO_TEXT =
  'Public libraries began as private collections that wealthy owners opened to a handful of scholars.'

/** Two keystrokes land wrong and stay wrong, as they would in a real run. */
const MISTAKES = new Set([37, 71])

/**
 * 141ms a character is roughly 85 words per minute — quick but attainable.
 * Picking a believable pace rather than an animator's pace is what lets the
 * WPM on screen be computed honestly from the demo's own clock instead of
 * being a number we made up.
 */
const STEP_MS = 141
const RESULT_DELAY_MS = 900
const TEST_SECONDS = 60

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export interface DemoHandle {
  /** Scrolls the section into view. */
  scrollIntoView: () => void
  /**
   * Replays only if the run has already ended. A run in progress is left
   * alone — restarting it would snatch back the thing the click asked to see.
   */
  replayIfFinished: () => void
}

export const DemoSection = forwardRef<DemoHandle>((_props, ref) => {
  const navigate = useNavigate()
  const sectionRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const resultRef = useRef<number | undefined>(undefined)

  const [typed, setTyped] = useState(0)
  const [finished, setFinished] = useState(false)
  const [started, setStarted] = useState(false)

  const stop = useCallback(() => {
    window.clearInterval(timerRef.current)
    window.clearTimeout(resultRef.current)
    timerRef.current = undefined
    resultRef.current = undefined
  }, [])

  const play = useCallback(() => {
    stop()
    setTyped(0)
    setFinished(false)
    setStarted(true)

    if (prefersReducedMotion()) {
      setTyped(DEMO_TEXT.length)
      setFinished(true)
      return
    }

    let count = 0
    timerRef.current = window.setInterval(() => {
      count += 1
      setTyped(count)

      if (count >= DEMO_TEXT.length) {
        window.clearInterval(timerRef.current)
        timerRef.current = undefined
        resultRef.current = window.setTimeout(() => setFinished(true), RESULT_DELAY_MS)
      }
    }, STEP_MS)
  }, [stop])

  useImperativeHandle(
    ref,
    () => ({
      scrollIntoView: () =>
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      replayIfFinished: () => {
        if (finished) play()
      },
    }),
    [finished, play]
  )

  // Starts when it comes into view, not on page load — otherwise it has played
  // itself out before anyone has scrolled far enough to see it.
  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    if (typeof IntersectionObserver === 'undefined') {
      play()
      return stop
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          play()
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(card)
    return () => {
      observer.disconnect()
      stop()
    }
  }, [play, stop])

  let correct = 0
  for (let i = 0; i < typed; i += 1) {
    if (!MISTAKES.has(i)) correct += 1
  }

  const elapsedMs = typed * STEP_MS
  const minutes = elapsedMs / 60000
  const wpm = minutes > 0 ? Math.round(correct / 5 / minutes) : 0
  const accuracy = typed > 0 ? Math.round((correct / typed) * 100) : 100
  const progress = Math.round((typed / DEMO_TEXT.length) * 100)
  const secondsLeft = Math.max(0, Math.round(TEST_SECONDS - elapsedMs / 1000))

  return (
    <section ref={sectionRef} className="tt-try relative overflow-hidden py-14 sm:py-[68px]">
      <div className="tt-try-glow" aria-hidden="true" />
      <FloatingKeys keys={DEMO_KEYS} />

      <div className="relative z-10 mx-auto max-w-[880px] px-5 text-center sm:px-10">
        <p className="tt-kicker mb-3">How it works</p>
        <h2 className="text-balance text-[30px] font-normal leading-tight tracking-tight sm:text-[42px]">
          Watch a test run.
        </h2>
        <p className="mx-auto mt-3.5 text-pretty text-[15.5px] leading-relaxed text-muted-foreground sm:text-[16.5px]">
          Real prose, real mistakes, real numbers.
        </p>

        <div ref={cardRef} className="tt-demo-card mt-7 text-left sm:mt-[38px]">
          <div className="mb-[15px] flex items-center justify-between border-b border-border/60 pb-[15px]">
            <div className="flex gap-2">
              <span className="tt-chip">Medium</span>
              <span className="tt-chip">1 minute</span>
            </div>
            <span className="tt-stat-num tabular-nums">
              0:{String(secondsLeft).padStart(2, '0')}
            </span>
          </div>

          <p className="tt-demo-line tt-demo-line-lg" aria-label={DEMO_TEXT}>
            {DEMO_TEXT.split('').map((char, index) => (
              <span
                key={index}
                className={cn(
                  'tt-ch',
                  index < typed && (MISTAKES.has(index) ? 'tt-ch-bad' : 'tt-ch-ok'),
                  index === typed && started && !finished && 'tt-ch-cursor'
                )}
              >
                {char}
              </span>
            ))}
          </p>

          <div className="tt-bar mt-[22px]">
            <div className="tt-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-[18px] flex items-center gap-[30px] border-t border-border/60 pt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="tt-stat-num tabular-nums">{wpm}</span>
              <span className="tt-stat-label">WPM</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="tt-stat-num tabular-nums">{accuracy}%</span>
              <span className="tt-stat-label">ACCURACY</span>
            </div>
          </div>

          {finished && (
            <div className="mt-5 flex flex-col items-stretch justify-between gap-5 border-t border-border/60 pt-5 sm:flex-row sm:items-center">
              <p className="text-[19px] leading-snug">
                That run was <b className="font-semibold text-primary">{wpm} WPM</b> at{' '}
                <b className="font-semibold text-primary">{accuracy}%</b> accuracy.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={play}
                  aria-label="Play the demo again"
                  title="Play again"
                  className="tt-btn tt-btn-quiet tt-btn-icon"
                >
                  <RotateCcw className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/start')}
                  className="tt-btn tt-btn-primary flex-1 sm:flex-none"
                >
                  Try it
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
})

DemoSection.displayName = 'DemoSection'

export default DemoSection
