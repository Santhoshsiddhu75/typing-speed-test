import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Runs 0 → 1 on an ease-out cubic once `ready` turns true, so a figure can
 * count up to whatever the API returned rather than snapping into place.
 * Restarts whenever `ready` flips, and returns 1 immediately for a reader who
 * has asked for less motion.
 *
 * `delay` holds it at 0 for that many milliseconds first, which is how the
 * chart line waits its turn behind the figures.
 */
export function useIntroProgress(ready: boolean, duration = 1250, delay = 0): number {
  const [progress, setProgress] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (!ready) return

    if (prefersReducedMotion()) {
      setProgress(1)
      return
    }

    const started = performance.now() + delay

    const step = (now: number) => {
      // requestAnimationFrame hands back the timestamp of the start of the
      // frame, which can predate the line above — so clamp the low end too, or
      // the easing goes negative and the figures flash a minus sign.
      const t = Math.min(1, Math.max(0, (now - started) / duration))
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) {
        frame.current = requestAnimationFrame(step)
      }
    }

    frame.current = requestAnimationFrame(step)

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [ready, duration, delay])

  return progress
}

export default useIntroProgress
