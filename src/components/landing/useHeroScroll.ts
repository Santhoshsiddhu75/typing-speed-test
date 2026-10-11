import { useLayoutEffect, useRef, useState } from 'react'
import { useScrollProgress } from '@/hooks/useScrollProgress'

/** Pinning is for a desktop with room to spare, and only when motion is welcome. */
const PIN_QUERY = '(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)'
/** Breathing room kept under the copy while it is pinned. */
const PIN_FOOT = 16
/** The fixed nav's height at rest, until it can be measured: 84px on a phone, 96px from sm up. */
const NAV_FALLBACK = () => (window.matchMedia('(min-width: 640px)').matches ? 96 : 84)

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * The hero's scroll story: whether it pins, and how far through it the
 * reader is (0..1).
 *
 * Desktop, when the copy fits: the hero pins and p is how far the wrapper
 * has scrolled past its top, over the pin's length. Otherwise the page
 * scrolls normally, p is 0 at the top of the page, and it reaches 1 when the
 * visual's top edge meets the bottom of the nav, so the end of the story
 * plays fully in view.
 */
export function useHeroScroll(enabled: boolean) {
  const pinRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const navBottom = useRef(0)
  const [pinned, setPinned] = useState(false)

  // Layout effect, so the first paint is already in its final shape: a pin
  // decided after paint would shift the copy.
  useLayoutEffect(() => {
    const content = contentRef.current
    const hero = heroRef.current
    const root = document.getElementById('root')
    if (!content || !hero || !root) return

    const query = window.matchMedia(PIN_QUERY)
    const decide = () => {
      if (!enabled || !query.matches) return setPinned(false)
      const style = getComputedStyle(content)
      const copy = content.offsetHeight - parseFloat(style.paddingTop)
      const above = parseFloat(getComputedStyle(hero).paddingTop)
      setPinned(above + copy + PIN_FOOT <= root.clientHeight)
    }

    decide()
    query.addEventListener('change', decide)
    window.addEventListener('resize', decide)
    // The copy changes height when its web font arrives.
    const observer = new ResizeObserver(decide)
    observer.observe(content)
    return () => {
      query.removeEventListener('change', decide)
      window.removeEventListener('resize', decide)
      observer.disconnect()
    }
  }, [enabled])

  const progress = useScrollProgress(() => {
    const root = document.getElementById('root')
    if (!root) return 0

    if (pinned) {
      const wrapper = pinRef.current
      const hero = heroRef.current
      if (!wrapper || !hero) return 0
      const length = wrapper.offsetHeight - hero.offsetHeight
      const passed = root.getBoundingClientRect().top - wrapper.getBoundingClientRect().top
      return length > 0 ? clamp01(passed / length) : 0
    }

    const box = boxRef.current
    if (!box) return 0
    // The nav shrinks once the page moves, so read it at rest and keep that.
    if (root.scrollTop <= 8 || !navBottom.current) {
      const header = document.querySelector('header')
      navBottom.current = root.scrollTop <= 8 && header ? header.getBoundingClientRect().bottom : NAV_FALLBACK()
    }
    const boxTopAtRest = box.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
    const run = boxTopAtRest - navBottom.current
    return run > 0 ? clamp01(root.scrollTop / run) : 1
  }, [pinned])

  return { pinned, progress, pinRef, heroRef, contentRef, boxRef }
}

export default useHeroScroll
