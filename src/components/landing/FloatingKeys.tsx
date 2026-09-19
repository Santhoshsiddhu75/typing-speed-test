import { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type Depth = 'near' | 'mid' | 'far'

export interface FloatingKey {
  label: string
  /** Offset from whichever edge is given. */
  left?: number
  right?: number
  top: number
  size: number
  rotate: number
  delay: number
  depth: Depth
  /** Kept at phone width; the rest drop out so they stop crowding the text. */
  onPhone?: boolean
  /** Placed for a phone's layout only, and hidden on anything wider. */
  phoneOnly?: boolean
}

/** Behind the hero. Between them they spell the name. */
export const HERO_KEYS: FloatingKey[] = [
  { label: 'T', left: 16, top: 104, size: 74, rotate: -9, delay: 0, depth: 'near', onPhone: true },
  { label: 'A', left: 112, top: 318, size: 46, rotate: 7, delay: 1.4, depth: 'mid' },
  { label: 'P', left: -6, top: 600, size: 84, rotate: 6, delay: 2.5, depth: 'far' },
  { label: 'T', left: 178, top: 812, size: 52, rotate: -5, delay: 3.4, depth: 'mid' },
  { label: 'E', right: 22, top: 128, size: 58, rotate: 8, delay: 0.8, depth: 'near', onPhone: true },
  { label: 'S', right: -14, top: 636, size: 88, rotate: -7, delay: 1.9, depth: 'far' },
  { label: 'T', right: 232, top: 828, size: 44, rotate: 5, delay: 4.1, depth: 'mid' },
]

/**
 * Behind the race section, from its top edge. Kept to the screen's margins,
 * clear of the card; on a phone, where the card fills the width, one key
 * peeks out above its corner.
 */
export const RACE_KEYS: FloatingKey[] = [
  { label: 'R', right: 30, top: 40, size: 62, rotate: 7, delay: 0.6, depth: 'near' },
  { label: 'A', left: 34, top: 150, size: 50, rotate: -6, delay: 2.2, depth: 'mid' },
  { label: 'C', left: -10, top: 380, size: 78, rotate: 5, delay: 1.1, depth: 'far' },
  { label: 'E', right: 64, top: 330, size: 44, rotate: -8, delay: 3.0, depth: 'mid' },
  { label: 'R', right: -14, top: -30, size: 54, rotate: 8, delay: 1.6, depth: 'mid', onPhone: true, phoneOnly: true },
]

/** Behind "How it works", from its top edge, either side of the centred column. */
export const DEMO_KEYS: FloatingKey[] = [
  { label: 'W', left: 60, top: 90, size: 58, rotate: -8, delay: 0.3, depth: 'near' },
  { label: 'P', right: 70, top: 200, size: 70, rotate: 6, delay: 1.8, depth: 'far' },
  { label: 'M', left: 150, top: 470, size: 44, rotate: 9, delay: 2.7, depth: 'mid' },
  { label: 'W', left: -18, top: 8, size: 50, rotate: -8, delay: 1.2, depth: 'mid', onPhone: true, phoneOnly: true },
]

/**
 * Decorative keycaps drifting behind a section. Physical keys rather than flat
 * tiles — a hard bottom edge for the throw, a soft cast shadow beneath — at
 * three depths so the eye reads distance rather than clutter.
 */
export const FloatingKeys: React.FC<{ className?: string; keys?: FloatingKey[] }> = ({
  className,
  keys = HERO_KEYS,
}) => (
  <div className={cn('tt-keys pointer-events-none absolute inset-0 z-0', className)} aria-hidden="true">
    {keys.map((key, index) => (
      <div
        key={`${key.label}-${index}`}
        className={cn(
          'tt-key',
          `tt-key-${key.depth}`,
          !key.onPhone && 'tt-key-wide-only',
          key.phoneOnly && 'tt-key-phone-only'
        )}
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
