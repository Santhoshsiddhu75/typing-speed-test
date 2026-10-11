import { useEffect, useRef, useState } from 'react'
import {
  FPS,
  INTRO_LAST_FRAME,
  LANDED_FRAME,
  SCROLL_FIRST_FRAME,
  createHeroKeyScene,
  frameForProgress,
} from '@/motion/hero-key'
import type { HeroAspect, HeroFraming, HeroKeyScene } from '@/motion/hero-key'
import type { ScrollProgress } from '@/hooks/useScrollProgress'
import { cn } from '@/lib/utils'
import { readHeroColors } from './readHeroColors'

/** How long the scene takes to fade in over the poster. Matches .tt-hero-canvas. */
const CROSSFADE_MS = 200
/** Each animation frame closes this share of the gap to the scroll's frame, at 60 Hz. */
const SMOOTHING = 0.12

interface HeroSceneProps {
  aspect: HeroAspect
  framing: HeroFraming
  progress: ScrollProgress
  /** The scene has faded in over the poster. */
  onShown: () => void
  onError: () => void
}

/**
 * Drives the scene. The scene draws whatever frame it is given; this decides
 * which. On load it plays the landing press by the clock, from the frame the
 * poster shows, then hands over to scroll: each animation frame moves the
 * shown frame part of the way toward the scroll's, so a flick glides rather
 * than jumps, and it always arrives. Nothing is drawn unless the frame
 * changes, and nothing at all while the visual is off screen or the tab is
 * hidden.
 */
const HeroScene: React.FC<HeroSceneProps> = ({ aspect, framing, progress, onShown, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HeroKeyScene | null>(null)
  const redrawRef = useRef<() => void>(() => {})
  const shape = useRef({ aspect, framing })
  const callbacks = useRef({ onShown, onError })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    callbacks.current = { onShown, onError }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let raf = 0
    let last = 0
    let current = LANDED_FRAME
    let shown = -1
    let target = frameForProgress(progress.get())
    /** When the landing press started playing, or -1 once it is over. */
    let introStart = -1
    let onScreen = true

    const draw = () => {
      const frame = Math.round(current)
      if (frame === shown || !sceneRef.current) return
      sceneRef.current.render(frame)
      shown = frame
    }
    redrawRef.current = () => {
      shown = -1
      draw()
    }

    const tick = (now: number) => {
      raf = 0
      if (disposed || !sceneRef.current) return
      const dt = last ? Math.min(64, now - last) : 1000 / FPS
      last = now
      let moving = false

      if (introStart >= 0) {
        const introFrame = LANDED_FRAME + (Math.max(0, now - introStart) / 1000) * FPS
        if (target > SCROLL_FIRST_FRAME) {
          // Scrolled mid-press: carry on from here toward the scroll's frame.
          introStart = -1
          current = Math.min(introFrame, INTRO_LAST_FRAME)
        } else if (introFrame >= INTRO_LAST_FRAME) {
          introStart = -1
          current = SCROLL_FIRST_FRAME
        } else {
          current = introFrame
          moving = true
        }
      }

      if (introStart < 0) {
        const gap = target - current
        if (Math.abs(gap) < 0.5) {
          current = target
        } else {
          current += gap * (1 - Math.pow(1 - SMOOTHING, dt / (1000 / FPS)))
          moving = true
        }
      }

      draw()
      if (moving && onScreen) raf = requestAnimationFrame(tick)
      else last = 0
    }

    /** Nothing moves until the scene has faded in over the poster. */
    let started = false
    const wake = () => {
      if (!raf && started && onScreen && sceneRef.current) raf = requestAnimationFrame(tick)
    }

    const unsubscribe = progress.subscribe((p) => {
      target = frameForProgress(p)
      wake()
    })

    const resize = () => {
      const scene = sceneRef.current
      if (!scene) return
      const cap = window.matchMedia('(min-width: 768px)').matches ? 2 : 1.5
      scene.setSize(canvas.clientWidth, canvas.clientHeight, Math.min(window.devicePixelRatio || 1, cap))
      redrawRef.current()
    }
    const resizeObserver = new ResizeObserver(resize)

    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting && !document.hidden
      if (onScreen) wake()
    })
    const onVisibility = () => {
      onScreen = !document.hidden
      if (onScreen) wake()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // The theme is a class on <html>, and can flip at any moment.
    const themeObserver = new MutationObserver(() => {
      sceneRef.current?.setProps({ colors: readHeroColors(), ...shape.current })
      redrawRef.current()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const onContextLost = (event: Event) => {
      event.preventDefault()
      callbacks.current.onError()
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    createHeroKeyScene(canvas, { colors: readHeroColors(), ...shape.current }).then(
      (scene) => {
        if (disposed) {
          scene.dispose()
          return
        }
        sceneRef.current = scene
        resizeObserver.observe(canvas)
        intersection.observe(canvas)
        resize()

        // Fade in on the frame the poster shows, then play the landing press.
        // Frame 90 is the same picture, so a reader already scrolling skips
        // the press and the story picks up from there.
        current = LANDED_FRAME
        redrawRef.current()
        setVisible(true)
        window.setTimeout(() => {
          if (disposed) return
          callbacks.current.onShown()
          started = true
          if (target > SCROLL_FIRST_FRAME) current = SCROLL_FIRST_FRAME
          else introStart = performance.now()
          wake()
        }, CROSSFADE_MS)
      },
      () => {
        if (!disposed) callbacks.current.onError()
      }
    )

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      unsubscribe()
      resizeObserver.disconnect()
      intersection.disconnect()
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [progress])

  useEffect(() => {
    shape.current = { aspect, framing }
    sceneRef.current?.setProps({ colors: readHeroColors(), aspect, framing })
    redrawRef.current()
  }, [aspect, framing])

  return <canvas ref={canvasRef} className={cn('tt-hero-canvas', visible && 'is-visible')} aria-hidden="true" />
}

export default HeroScene
