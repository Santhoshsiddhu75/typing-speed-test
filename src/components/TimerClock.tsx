import { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface TimerClockProps {
  /** Seconds the sweep hand takes for one full turn. */
  period: number
  className?: string
}

/**
 * Analog dial for the timer options. The sweep hand turns once every
 * `period` seconds and keeps going; the green arc closes on the first turn
 * and then stays closed. A longer period reads as a longer test.
 */
export const TimerClock: React.FC<TimerClockProps> = ({ period, className }) => (
  <svg
    className={cn('tt-clock block h-[72px] w-[72px] md:h-[120px] md:w-[120px]', className)}
    viewBox="0 0 120 120"
    style={{ '--tt-p': `${period}s` } as CSSProperties}
    aria-hidden="true"
    focusable="false"
  >
    <circle className="tt-face" cx="60" cy="60" r="55" />
    <circle className="tt-tick-minor" cx="60" cy="60" r="48" transform="rotate(-90 60 60)" />
    <circle className="tt-tick-major" cx="60" cy="60" r="48" transform="rotate(-90 60 60)" />
    <circle className="tt-trail" cx="60" cy="60" r="41" transform="rotate(-90 60 60)" />
    <g className="tt-hand-hr">
      <line x1="60" y1="62" x2="60" y2="40" />
    </g>
    <g className="tt-hand-min">
      <line x1="60" y1="66" x2="60" y2="25" />
    </g>
    <circle className="tt-pin" cx="60" cy="60" r="3.5" />
    <circle className="tt-pin-dot" cx="60" cy="60" r="1.5" />
  </svg>
)

export default TimerClock
