import { useEffect, useRef, useState } from 'react'
// Straight from the modules rather than the package index, which also
// exports the scene: three.js must stay out of this chunk.
import {
  FPS,
  INTRO_LAST_FRAME,
  LANDED_FRAME,
  SCROLL_FIRST_FRAME,
  WAVE,
  frameForProgress,
} from '@/motion/hero-key/constants'
import { drawGlyphAtlas, loadGlyphFont } from '@/motion/hero-key/glyphs'
import { LETTERS } from '@/motion/hero-key/layout'
import type { HeroAspect, HeroFraming } from '@/motion/hero-key/types'
import type { ScrollProgress } from '@/hooks/useScrollProgress'
import { cn } from '@/lib/utils'
import { HeroEngine, HeroEngineKind, startHeroEngine } from './heroEngine'
import { readHeroColors } from './readHeroColors'

/** How long the scene takes to fade in over the poster. Matches .tt-hero-canvas. */
const CROSSFADE_MS = 200
/** Each animation frame closes this share of the gap to the scroll's frame, at 60 Hz. */
const SMOOTHING = 0.12

interface HeroSceneProps {
  aspect: HeroAspect
  framing: HeroFraming
  /** Where to draw. A worker that fails to start falls back to the main thread. */
  engine: HeroEngineKind
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
 *
 * Once the keyboard is up, the light wave runs on its own clock, counted
 * from the moment the keys came up: the one thing drawn without the frame
 * changing, at 30 fps, and never for a reader who asked for less motion.
 */
const HeroScene: React.FC<HeroSceneProps> = ({ aspect, framing, engine: preferred, progress, onShown, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<HeroEngine | null>(null)
  const shape = useRef({ aspect, framing })
  const callbacks = useRef({ onShown, onError })
  const [engine, setEngine] = useState(preferred)
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
    let shown = LANDED_FRAME
    let target = frameForProgress(progress.get())
    /** When the landing press started playing, or -1 once it is over. */
    let introStart = -1
    let onScreen = true
    /** Nothing moves until the scene has faded in over the poster. */
    let started = false
    /** When the keyboard came up, or null while it is not up. */
    let waveStart: number | null = null
    let lastWave = 0
    const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const draw = (now: number) => {
      const frame = Math.round(current)
      let wave = 0
      if (frame >= WAVE.fromFrame && !lessMotion.matches) {
        if (waveStart === null) waveStart = now
        wave = (now - waveStart) / 1000
      } else {
        waveStart = null
      }
      const waveDue = waveStart !== null && now - lastWave >= 1000 / WAVE.fps - 2
      if ((frame === shown && !waveDue) || !engineRef.current) return
      engineRef.current.render(frame, wave)
      shown = frame
      if (waveDue) lastWave = now
    }

    const tick = (now: number) => {
      raf = 0
      if (disposed || !engineRef.current) return
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

      draw(now)
      // The wave keeps the loop going after the scroll has settled.
      if ((moving || waveStart !== null) && onScreen) raf = requestAnimationFrame(tick)
      else last = 0
    }

    const wake = () => {
      if (!raf && started && onScreen && engineRef.current) raf = requestAnimationFrame(tick)
    }

    const unsubscribe = progress.subscribe((p) => {
      target = frameForProgress(p)
      wake()
    })

    const size = () => ({
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      // At most 1.5x on a phone and 2x on a desktop: the box is all there is
      // to fill, and every extra pixel is drawn on every frame.
      pixelRatio: Math.min(window.devicePixelRatio || 1, window.matchMedia('(min-width: 768px)').matches ? 2 : 1.5),
    })
    const resizeObserver = new ResizeObserver(() => engineRef.current?.setSize(size()))

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
      engineRef.current?.setProps({ colors: readHeroColors(), ...shape.current })
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const start = async () => {
      // The letters are drawn here, where the page's fonts are; a worker has none.
      await loadGlyphFont(LETTERS)
      const glyphs = drawGlyphAtlas(LETTERS)
      return startHeroEngine(engine, {
        canvas,
        props: { colors: readHeroColors(), ...shape.current },
        glyphs,
        size: size(),
        // The poster is this frame, so the scene can fade in over it unseen.
        frame: LANDED_FRAME,
        onLost: () => {
          if (!disposed) callbacks.current.onError()
        },
      })
    }

    start().then(
      (ready) => {
        if (disposed) {
          ready.dispose()
          return
        }
        engineRef.current = ready
        resizeObserver.observe(canvas)
        intersection.observe(canvas)
        setVisible(true)
        window.setTimeout(() => {
          if (disposed) return
          callbacks.current.onShown()
          started = true
          // Frame 90 is the same picture as the poster, so a reader already
          // scrolling skips the landing press and picks up the story there.
          if (target > SCROLL_FIRST_FRAME) current = SCROLL_FIRST_FRAME
          else introStart = performance.now()
          wake()
        }, CROSSFADE_MS)
      },
      () => {
        if (disposed) return
        // A worker that could not start gets one more try on the main
        // thread, on a fresh canvas: this one has been handed to the worker.
        if (engine === 'worker') setEngine('main')
        else callbacks.current.onError()
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
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [engine, progress])

  useEffect(() => {
    shape.current = { aspect, framing }
    engineRef.current?.setProps({ colors: readHeroColors(), aspect, framing })
  }, [aspect, framing])

  return (
    <canvas
      key={engine}
      ref={canvasRef}
      className={cn('tt-hero-canvas', visible && 'is-visible')}
      aria-hidden="true"
    />
  )
}

export default HeroScene
