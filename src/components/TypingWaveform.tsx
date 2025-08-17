import { useEffect, useRef, useCallback } from 'react'

interface TypingWaveformProps {
  typingSpeed: number // Characters per second
  isActive: boolean
  className?: string
}

// interface WaveLayer {
//   frequency: number
//   phase: number
//   amplitude: number
//   speed: number
// }

export const TypingWaveform: React.FC<TypingWaveformProps> = ({ 
  typingSpeed, 
  isActive, 
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const timeRef = useRef(0)
  const currentAmplitudeRef = useRef(0)
  const currentFrequencyRef = useRef(0)
  const lastUpdateTimeRef = useRef(0)
  
  // Enhanced wave configuration for better sensitivity
  const WAVE_COUNT = 4
  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 80
  const MAX_AMPLITUDE = 35
  const MIN_FREQUENCY_MULTIPLIER = 0.5
  const MAX_FREQUENCY_MULTIPLIER = 3.0
  
  // Much more aggressive decay and response settings
  // const FAST_DECAY_RATE = 0.15  // Exponential decay factor (was 0.95)
  const AMPLITUDE_RESPONSE = 0.8 // How quickly amplitude responds (was 0.1)
  const FREQUENCY_RESPONSE = 0.6 // How quickly frequency responds
  const SILENCE_THRESHOLD = 300  // ms before starting aggressive decay (was 1000)

  // Easing function for smooth but snappy transitions
  // const easeOutExpo = (t: number): number => {
  //   return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  // }

  // Convert typing speed to intensity (0-1 range) with better scaling
  const getTypingIntensity = useCallback((speed: number): number => {
    // More dramatic scaling: slow typing is very low, fast typing is very high
    const scaledSpeed = Math.pow(Math.min(speed / 8, 1), 0.7) // Power curve for better feel
    return scaledSpeed
  }, [])

  // Get dynamic colors based on typing intensity
  const getWaveColors = useCallback((intensity: number) => {
    if (intensity < 0.2) {
      // Very slow - cool blue
      return {
        primary: `rgba(59, 130, 246, ${0.4 + intensity * 0.4})`, // blue-500
        secondary: `rgba(96, 165, 250, ${0.3 + intensity * 0.3})`, // blue-400
        accent: `rgba(147, 197, 253, ${0.2 + intensity * 0.2})` // blue-300
      }
    } else if (intensity < 0.5) {
      // Medium - purple/violet
      return {
        primary: `rgba(139, 92, 246, ${0.5 + intensity * 0.3})`, // violet-500
        secondary: `rgba(167, 139, 250, ${0.4 + intensity * 0.3})`, // violet-400
        accent: `rgba(196, 181, 253, ${0.3 + intensity * 0.2})` // violet-300
      }
    } else if (intensity < 0.8) {
      // Fast - pink/rose
      return {
        primary: `rgba(236, 72, 153, ${0.6 + intensity * 0.3})`, // pink-500
        secondary: `rgba(244, 114, 182, ${0.5 + intensity * 0.3})`, // pink-400
        accent: `rgba(251, 207, 232, ${0.4 + intensity * 0.2})` // pink-200
      }
    } else {
      // Very fast - red/orange
      return {
        primary: `rgba(239, 68, 68, ${0.7 + intensity * 0.3})`, // red-500
        secondary: `rgba(248, 113, 113, ${0.6 + intensity * 0.3})`, // red-400
        accent: `rgba(254, 202, 202, ${0.5 + intensity * 0.2})` // red-200
      }
    }
  }, [])

  // Center-focused amplitude falloff function (Gaussian-like curve)
  const getCenterAmplitudeFalloff = useCallback((normalizedX: number): number => {
    // Create a bell curve centered at 0.5 (middle of canvas)
    const center = 0.5
    const width = 0.25 // Much narrower center focus for more dramatic effect
    const distanceFromCenter = Math.abs(normalizedX - center)
    
    // Steeper Gaussian falloff: very strong in center, much flatter at edges
    const falloff = Math.exp(-(distanceFromCenter * distanceFromCenter) / (2 * width * width))
    
    // Much lower minimum amplitude at edges - nearly flat when not typing
    return Math.max(falloff, 0.02)
  }, [])

  const drawWave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const currentTime = Date.now()
    const deltaTime = currentTime - lastUpdateTimeRef.current
    lastUpdateTimeRef.current = currentTime

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Calculate time since last typing activity
    const timeSinceLastKey = currentTime - (lastUpdateTimeRef.current || 0)
    
    // Get current typing intensity
    const targetIntensity = isActive && typingSpeed > 0 ? getTypingIntensity(typingSpeed) : 0
    
    // Fast exponential decay when not typing
    let decayFactor = 1
    if (!isActive || typingSpeed === 0 || timeSinceLastKey > SILENCE_THRESHOLD) {
      // Exponential decay - much faster than before
      decayFactor = Math.exp(-deltaTime * 0.008) // Aggressive decay
    }

    // Update amplitude with faster response and decay
    const amplitudeDiff = (targetIntensity * MAX_AMPLITUDE) - currentAmplitudeRef.current
    currentAmplitudeRef.current += amplitudeDiff * AMPLITUDE_RESPONSE
    currentAmplitudeRef.current *= decayFactor

    // Update frequency multiplier based on typing speed
    const targetFreqMult = MIN_FREQUENCY_MULTIPLIER + (targetIntensity * (MAX_FREQUENCY_MULTIPLIER - MIN_FREQUENCY_MULTIPLIER))
    const freqDiff = targetFreqMult - currentFrequencyRef.current
    currentFrequencyRef.current += freqDiff * FREQUENCY_RESPONSE
    currentFrequencyRef.current = Math.max(currentFrequencyRef.current * decayFactor, MIN_FREQUENCY_MULTIPLIER)

    // Update time with dynamic speed based on intensity
    timeRef.current += (0.02 + targetIntensity * 0.04) * currentFrequencyRef.current

    // Get colors based on current intensity
    const intensity = currentAmplitudeRef.current / MAX_AMPLITUDE
    const colors = getWaveColors(intensity)

    // Create center-focused gradient that emphasizes the middle
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0)
    // Extract RGB values and create very faded versions for edges
    const veryFadedPrimary = colors.primary.replace(/rgba?\(([^)]+)\)/, (_match, values) => {
      const [r, g, b] = values.split(',').map((v: string) => v.trim())
      return `rgba(${r}, ${g}, ${b}, 0.1)`
    })
    const fadedSecondary = colors.secondary.replace(/rgba?\(([^)]+)\)/, (_match, values) => {
      const [r, g, b] = values.split(',').map((v: string) => v.trim())
      return `rgba(${r}, ${g}, ${b}, 0.4)`
    })
    
    gradient.addColorStop(0, veryFadedPrimary) // Very faded edges
    gradient.addColorStop(0.2, fadedSecondary)
    gradient.addColorStop(0.4, colors.secondary)
    gradient.addColorStop(0.5, colors.primary) // Bright center
    gradient.addColorStop(0.6, colors.secondary)
    gradient.addColorStop(0.8, fadedSecondary)
    gradient.addColorStop(1, veryFadedPrimary) // Very faded edges

    // Draw wave layers with center-focused amplitude
    for (let layer = 0; layer < WAVE_COUNT; layer++) {
      ctx.beginPath()
      ctx.strokeStyle = gradient
      ctx.lineWidth = (3.5 - layer * 0.5) * Math.min(intensity * 1.5 + 0.3, 1)
      ctx.globalAlpha = (0.8 - layer * 0.12) * Math.min(intensity * 1.8 + 0.2, 1)

      const points = []
      const step = 2 // Even smoother curves
      
      // Layer-specific properties
      const layerPhase = (layer * Math.PI) / 3
      const layerFreq = 1 + layer * 0.25
      const baseLayerAmplitude = currentAmplitudeRef.current * (1 - layer * 0.15)
      
      for (let x = 0; x <= CANVAS_WIDTH; x += step) {
        const normalizedX = x / CANVAS_WIDTH
        
        // Apply center-focused falloff to amplitude
        const centerFalloff = getCenterAmplitudeFalloff(normalizedX)
        const layerAmplitude = baseLayerAmplitude * centerFalloff
        
        // Primary wave with center-focused amplitude and dynamic frequency
        const primaryWave = Math.sin(
          normalizedX * Math.PI * 4 * layerFreq + 
          layerPhase + 
          timeRef.current * (1.5 + layer * 0.3)
        ) * layerAmplitude

        // Secondary harmonic - also center-focused
        const harmonic = Math.sin(
          normalizedX * Math.PI * 8 * layerFreq + 
          layerPhase * 1.3 + 
          timeRef.current * (2.2 + layer * 0.4)
        ) * layerAmplitude * 0.35

        // Tertiary wave for organic complexity - subtle center focus
        const detail = Math.sin(
          normalizedX * Math.PI * 16 * layerFreq + 
          layerPhase * 1.8 + 
          timeRef.current * (3.5 + layer * 0.6)
        ) * layerAmplitude * 0.12

        // Additional ripple effect that emanates from center
        const ripple = Math.sin(
          Math.abs(normalizedX - 0.5) * Math.PI * 12 + 
          timeRef.current * 2.8
        ) * layerAmplitude * 0.08 * centerFalloff

        const y = CANVAS_HEIGHT / 2 + primaryWave + harmonic + detail + ripple
        points.push({ x, y })
      }

      // Draw smooth curves using quadratic bezier
      if (points.length > 2) {
        ctx.moveTo(points[0].x, points[0].y)
        
        for (let i = 1; i < points.length - 2; i++) {
          const cpx = (points[i].x + points[i + 1].x) / 2
          const cpy = (points[i].y + points[i + 1].y) / 2
          ctx.quadraticCurveTo(points[i].x, points[i].y, cpx, cpy)
        }
        
        // Complete the curve
        if (points.length > 2) {
          ctx.quadraticCurveTo(
            points[points.length - 2].x, 
            points[points.length - 2].y,
            points[points.length - 1].x, 
            points[points.length - 1].y
          )
        }
      }

      ctx.stroke()
    }

    // Draw subtle center indicator and edge fade when mostly inactive
    if (currentAmplitudeRef.current < 3) {
      // Center focus indicator - subtle pulsing dot
      ctx.beginPath()
      ctx.fillStyle = `rgba(148, 163, 184, ${0.2 + Math.sin(timeRef.current * 2) * 0.1})`
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 2, 0, Math.PI * 2)
      ctx.fill()
      
      // Subtle center line when very inactive
      if (currentAmplitudeRef.current < 1.5) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)'
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.3
        ctx.setLineDash([3, 6])
        ctx.moveTo(CANVAS_WIDTH * 0.2, CANVAS_HEIGHT / 2)
        ctx.lineTo(CANVAS_WIDTH * 0.8, CANVAS_HEIGHT / 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    ctx.globalAlpha = 1

  }, [typingSpeed, isActive, getTypingIntensity, getWaveColors, getCenterAmplitudeFalloff])

  // Animation loop with immediate response
  useEffect(() => {
    lastUpdateTimeRef.current = Date.now()
    
    const animate = () => {
      drawWave()
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [drawWave])

  // Store last keypress time globally for decay calculation
  useEffect(() => {
    if (typingSpeed > 0) {
      lastUpdateTimeRef.current = Date.now()
    }
  }, [typingSpeed])

  return (
    <div className={`relative overflow-hidden rounded-lg bg-transparent ${className}`}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full bg-transparent"
        style={{ maxHeight: '80px' }}
      />
      {currentAmplitudeRef.current < 2 && !isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-muted-foreground opacity-60 font-medium">
            Start typing to see the waveform...
          </span>
        </div>
      )}
    </div>
  )
}