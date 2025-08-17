import { useMemo } from 'react'
import { formatTime } from '@/lib/utils'

interface CircularTimerProps {
  timeRemaining: number
  totalTime: number
  className?: string
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  timeRemaining,
  totalTime,
  className = ''
}) => {
  // Calculate progress percentage (0-100)
  const progressPercentage = useMemo(() => {
    return Math.max(0, (timeRemaining / totalTime) * 100)
  }, [timeRemaining, totalTime])
  
  // Calculate color based on remaining time using green theme
  const getTimerColor = useMemo(() => {
    const percentage = progressPercentage
    
    if (percentage > 50) {
      // Green to yellow transition (50% - 100%)
      const intensity = (percentage - 50) / 50 // 0 to 1
      // Use theme green color: rgb(34, 197, 94)
      const red = Math.round(34 + (221 * (1 - intensity))) // 34 to 255
      const green = Math.round(197 + (58 * (1 - intensity))) // 197 to 255
      const blue = Math.round(94 * intensity) // 94 to 0
      return `rgb(${red}, ${green}, ${blue})`
    } else {
      // Yellow to red transition (0% - 50%)
      const intensity = percentage / 50 // 0 to 1
      const red = 255
      const green = Math.round(255 * intensity)
      return `rgb(${red}, ${green}, 0)`
    }
  }, [progressPercentage])
  
  // SVG circle properties for thin progress ring
  const size = 120 // Card size
  const radius = 55 // Slightly smaller than card to fit inside
  const strokeWidth = 3 // Thin stroke
  const normalizedRadius = radius - strokeWidth
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Thin Progress Circle */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle - white in light mode, dark in dark mode */}
        <circle
          fill="white"
          r={normalizedRadius + 5}
          cx={size / 2}
          cy={size / 2}
          className="drop-shadow-md dark:fill-[rgb(28,46,56)]"
        />
        {/* Background ring - very subtle */}
        <circle
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeOpacity={0.1}
          fill="transparent"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle - thin colored ring */}
        <circle
          stroke={getTimerColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      
      {/* Time display in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl md:text-3xl font-bold font-mono" data-testid="timer-display">
          {formatTime(timeRemaining)}
        </div>
        <div className="text-xs text-muted-foreground">
          Time Left
        </div>
      </div>
    </div>
  )
}