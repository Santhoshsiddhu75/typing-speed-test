import { Component, ReactNode, RefObject, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import type { ScrollProgress } from '@/hooks/useScrollProgress'
import { HeroMode, SQUARE_QUERY, WHOLE_QUERY, posterSrc, webglSupport } from './heroMode'
import type { HeroEngineKind } from './heroEngine'

// three.js and the scene come in their own chunk, after first paint.
const HeroScene = lazy(() => import('./HeroScene'))

/** Drops back to the poster if the scene throws while rendering. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Lowercase on purpose: React 18 does not know fetchPriority and would warn. */
const HIGH_PRIORITY = { fetchpriority: 'high' } as Record<string, string>

interface HeroVisualProps {
  mode: HeroMode
  progress: ScrollProgress
  boxRef: RefObject<HTMLDivElement>
  /** The scene could not run here; the parent stops pinning for it. */
  onUnavailable: () => void
}

/**
 * The hero's right-hand visual: the logo key in 3D. The box is reserved by
 * its aspect ratio before anything loads, and a poster of the scene's own
 * frame fills it at first paint. The scene itself arrives later and fades in
 * over the poster; the two match exactly, so nothing moves.
 */
export const HeroVisual: React.FC<HeroVisualProps> = ({ mode, progress, boxRef, onUnavailable }) => {
  const { theme } = useTheme()
  const [square, setSquare] = useState(() => window.matchMedia(SQUARE_QUERY).matches)
  const [whole, setWhole] = useState(() => window.matchMedia(WHOLE_QUERY).matches)
  const [engine, setEngine] = useState<HeroEngineKind | null>(null)
  const [sceneShown, setSceneShown] = useState(false)
  const floatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const squareQuery = window.matchMedia(SQUARE_QUERY)
    const wholeQuery = window.matchMedia(WHOLE_QUERY)
    const update = () => {
      setSquare(squareQuery.matches)
      setWhole(wholeQuery.matches)
    }
    squareQuery.addEventListener('change', update)
    wholeQuery.addEventListener('change', update)
    return () => {
      squareQuery.removeEventListener('change', update)
      wholeQuery.removeEventListener('change', update)
    }
  }, [])

  // The scene waits for the page to finish loading, then for the browser to
  // go idle, so the copy, the buttons and the poster never wait on it.
  useEffect(() => {
    if (mode !== 'live') return
    let cancelled = false
    let idle = 0
    const start = () => {
      if (cancelled) return
      const support = webglSupport()
      if (support) setEngine(support)
      else onUnavailable()
    }
    // Safari has no requestIdleCallback; a short timeout stands in.
    const canIdle = typeof window.requestIdleCallback === 'function'
    const whenIdle = () => {
      idle = canIdle ? window.requestIdleCallback(start, { timeout: 2500 }) : window.setTimeout(start, 800)
    }
    if (document.readyState === 'complete') whenIdle()
    else window.addEventListener('load', whenIdle, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', whenIdle)
      if (canIdle) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
    }
  }, [mode, onUnavailable])

  // The idle float settles as the story starts: gone by 10% of the scroll.
  useEffect(() => {
    const float = floatRef.current
    if (!float || mode === 'final') return
    return progress.subscribe((p) => {
      const settle = Math.max(0, 1 - p / 0.1)
      float.style.setProperty('--tt-hero-float-k', String(settle))
      float.style.animationPlayState = settle > 0 ? 'running' : 'paused'
    })
  }, [mode, progress])

  const live = mode === 'live' && engine !== null
  // Hidden only once the scene has faded in over it, and back if the scene goes.
  const posterHidden = live && sceneShown

  return (
    <div ref={boxRef} className="tt-hero-box">
      <div ref={floatRef} className={mode === 'final' ? 'tt-hero-float' : 'tt-hero-float is-floating'}>
        <div className="tt-hero-stage" aria-hidden="true">
          <img
            className="tt-hero-poster"
            src={posterSrc(mode, theme, square)}
            alt=""
            draggable={false}
            style={posterHidden ? { visibility: 'hidden' } : undefined}
            {...HIGH_PRIORITY}
          />
          {live && (
            <SceneBoundary onError={onUnavailable}>
              <Suspense fallback={null}>
                <HeroScene
                  aspect={square ? 'square' : 'portrait'}
                  framing={whole ? 'whole' : 'close'}
                  engine={engine ?? 'main'}
                  progress={progress}
                  onShown={() => setSceneShown(true)}
                  onError={onUnavailable}
                />
              </Suspense>
            </SceneBoundary>
          )}
        </div>
      </div>
    </div>
  )
}

export default HeroVisual
