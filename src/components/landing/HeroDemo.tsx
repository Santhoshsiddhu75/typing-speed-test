import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

/** A real sentence from the passage library, not filler. */
const DEMO_TEXT = 'The bicycle changed ordinary life faster than almost any invention.'
/** Two keystrokes land wrong, as they would in an actual run. */
const MISTAKES = new Set([21, 46])

const STEP_MS = 54
const HOLD_MS = 2600
const PEAK_WPM = 78
const RING_CIRCUMFERENCE = 257.61

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * The hero's self-running demo: the product in miniature rather than a
 * recording of it. Stays sharp at any size, costs nothing to load, themes
 * itself, and cannot drift out of date with the real interface.
 */
export const HeroDemo: React.FC<{ className?: string }> = ({ className }) => {
  const reduced = useMemo(prefersReducedMotion, [])
  const [typed, setTyped] = useState(reduced ? DEMO_TEXT.length : 0)

  useEffect(() => {
    if (reduced) return

    let count = 0
    let holdUntil = 0

    const id = window.setInterval(() => {
      if (Date.now() < holdUntil) return

      if (count >= DEMO_TEXT.length) {
        count = 0
        setTyped(0)
        return
      }

      count += 1
      setTyped(count)
      if (count >= DEMO_TEXT.length) holdUntil = Date.now() + HOLD_MS
    }, STEP_MS)

    return () => window.clearInterval(id)
  }, [reduced])

  const progress = typed / DEMO_TEXT.length
  const wpm = Math.round(PEAK_WPM * progress)
  const secondsLeft = Math.max(0, Math.round(60 - 42 * progress))

  return (
    <div className={cn('tt-demo-card relative w-full max-w-[470px]', className)}>
      <div className="mb-[15px] flex items-center justify-between border-b border-border/60 pb-[15px]">
        <div className="flex gap-2">
          <span className="tt-chip">Medium</span>
          <span className="tt-chip">1 minute</span>
        </div>

        <svg className="h-[46px] w-[46px] flex-shrink-0" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="tt-demo-face" cx="60" cy="60" r="55" />
          <circle className="tt-demo-track" cx="60" cy="60" r="41" />
          <circle
            className="tt-demo-arc"
            cx="60"
            cy="60"
            r="41"
            transform="rotate(-90 60 60)"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * 0.69 * progress}
          />
        </svg>
      </div>

      <p className="tt-demo-line" aria-label={DEMO_TEXT}>
        {DEMO_TEXT.split('').map((char, index) => (
          <span
            key={index}
            className={cn(
              'tt-ch',
              index < typed && (MISTAKES.has(index) ? 'tt-ch-bad' : 'tt-ch-ok'),
              index === typed && !reduced && 'tt-ch-cursor'
            )}
          >
            {char}
          </span>
        ))}
      </p>

      <div className="mt-[14px] flex items-center justify-between border-t border-border/60 pt-[14px]">
        <div className="flex items-baseline gap-1.5">
          <span className="tt-stat-num tabular-nums">{wpm}</span>
          <span className="tt-stat-label">WPM</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="tt-stat-num tabular-nums">{typed > 0 ? 97 : 100}%</span>
          <span className="tt-stat-label">ACCURACY</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="tt-stat-num tabular-nums">0:{String(secondsLeft).padStart(2, '0')}</span>
          <span className="tt-stat-label">LEFT</span>
        </div>
      </div>
    </div>
  )
}

export default HeroDemo
