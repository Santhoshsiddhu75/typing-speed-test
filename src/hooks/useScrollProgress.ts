import { useEffect, useLayoutEffect, useState } from 'react'

/** A progress value that changes on scroll, without re-rendering React. */
export interface ScrollProgress {
  /** The latest value, 0..1. */
  get(): number
  /** Called inside requestAnimationFrame whenever the value changes. */
  subscribe(listener: (progress: number) => void): () => void
}

function createProgress(): ScrollProgress & { set(value: number): void } {
  let value = 0
  const listeners = new Set<(progress: number) => void>()
  return {
    get: () => value,
    set(next) {
      if (next === value) return
      value = next
      listeners.forEach((listener) => listener(value))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * Scroll progress for one stretch of the page, from `measure`.
 *
 * index.css pins html and body and makes #root the scroll container, so
 * window never scrolls: this listens on #root. One passive listener, and the
 * work (measure, which reads layout) happens once per animation frame at
 * most. No wheel or touch handlers and no preventDefault: it only watches.
 *
 * `deps` re-measure when the layout that `measure` reads has changed.
 */
export function useScrollProgress(measure: () => number, deps: unknown[] = []): ScrollProgress {
  const [progress] = useState(createProgress)
  const [read] = useState(() => ({ measure }))

  useLayoutEffect(() => {
    read.measure = measure
  })

  useEffect(() => {
    const root = document.getElementById('root')
    let frame = 0

    const update = () => {
      frame = 0
      progress.set(read.measure())
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    schedule()
    root?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      root?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, read, ...deps])

  return progress
}

export default useScrollProgress
