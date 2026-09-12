import { Zap, Brain, Flame } from 'lucide-react'
import { DifficultyLevel } from '@/types'
import { cn } from '@/lib/utils'

interface DifficultyMedallionProps {
  difficulty: DifficultyLevel
  className?: string
}

const ICONS = {
  easy: Zap,
  medium: Brain,
  hard: Flame,
} as const

/** How many of the three arcs are lit. */
const LEVELS: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

/** The three arcs start at 12 o'clock and repeat every 120 degrees. */
const SEGMENT_ROTATIONS = [-90, 30, 150]

/**
 * Difficulty counterpart to {@link TimerClock} — same circle, same place on
 * the card, so the step transition carries one round shape across. Discrete
 * arcs read as "level 2 of 3" where a part-filled ring would read as progress.
 */
export const DifficultyMedallion: React.FC<DifficultyMedallionProps> = ({
  difficulty,
  className,
}) => {
  const Icon = ICONS[difficulty]
  const lit = LEVELS[difficulty]

  return (
    <div
      className={cn(
        'tt-medallion relative h-[72px] w-[72px] shrink-0 md:h-[120px] md:w-[120px]',
        `tt-m-${difficulty}`,
        className
      )}
    >
      <svg className="block h-full w-full" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle className="tt-face" cx="60" cy="60" r="55" />
        {SEGMENT_ROTATIONS.map((rotation, index) => (
          <circle
            key={rotation}
            className={cn('tt-seg', index < lit && 'tt-seg-on')}
            cx="60"
            cy="60"
            r="45"
            transform={`rotate(${rotation} 60 60)`}
          />
        ))}
      </svg>
      <div className="tt-medallion-icon absolute inset-0 flex items-center justify-center">
        <Icon
          className={cn(`tt-i-${difficulty}`, 'h-[26px] w-[26px] md:h-10 md:w-10')}
          strokeWidth={1.9}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export default DifficultyMedallion
