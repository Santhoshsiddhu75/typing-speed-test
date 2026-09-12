import { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type Depth = 'near' | 'mid' | 'far'

interface Key {
  label: string
  /** Offset from whichever edge is given. */
  left?: number
  right?: number
  top: number
  size: number
  rotate: number
  delay: number
  depth: Depth
  /** Kept at phone width; the rest drop out so they stop crowding the headline. */
  onPhone?: boolean
}

const KEYS: Key[] = [
  { label: 'T', left: 16, top: 104, size: 74, rotate: -9, delay: 0, depth: 'near', onPhone: true },
  { label: 'A', left: 112, top: 318, size: 46, rotate: 7, delay: 1.4, depth: 'mid' },
  { label: 'P', left: -6, top: 600, size: 84, rotate: 6, delay: 2.5, depth: 'far' },
  { label: 'T', left: 178, top: 812, size: 52, rotate: -5, delay: 3.4, depth: 'mid' },
  { label: 'E', right: 22, top: 128, size: 58, rotate: 8, delay: 0.8, depth: 'near', onPhone: true },
  { label: 'S', right: -14, top: 636, size: 88, rotate: -7, delay: 1.9, depth: 'far' },
  { label: 'T', right: 232, top: 828, size: 44, rotate: 5, delay: 4.1, depth: 'mid' },
]

/**
 * Decorative keycaps drifting behind the hero. Physical keys rather than flat
 * tiles — a hard bottom edge for the throw, a soft cast shadow beneath — at
 * three depths so the eye reads distance rather than clutter.
 */
export const FloatingKeys: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('tt-keys pointer-events-none absolute inset-0 z-0', className)} aria-hidden="true">
    {KEYS.map((key, index) => (
      <div
        key={`${key.label}-${index}`}
        className={cn('tt-key', `tt-key-${key.depth}`, !key.onPhone && 'tt-key-wide-only')}
        style={
          {
            left: key.left !== undefined ? `${key.left}px` : undefined,
            right: key.right !== undefined ? `${key.right}px` : undefined,
            top: `${key.top}px`,
            width: `${key.size}px`,
            height: `${key.size}px`,
            fontSize: `${Math.round(key.size * 0.3)}px`,
            animationDelay: `${key.delay}s`,
            '--tt-key-rotate': `${key.rotate}deg`,
          } as CSSProperties
        }
      >
        {key.label}
      </div>
    ))}
  </div>
)

export default FloatingKeys
