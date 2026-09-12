import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

interface UseTypingFieldOptions {
  /** Scrolled to the top of the screen whenever the software keyboard opens. */
  scrollTargetRef: RefObject<HTMLElement>
  /** Set false to stop listening, e.g. once a test has finished. */
  enabled?: boolean
}

/**
 * The mobile half of a typing field: a hidden input that takes the keystrokes,
 * and the scrolling needed to keep the text visible once the software keyboard
 * covers the bottom of the screen.
 *
 * This is the same approach `TypingTestScreen` uses inline. It deliberately
 * leaves out that screen's blur guard, which forces focus back if you tap away:
 * correct mid-test, hostile on a landing page where someone may just want to
 * scroll on.
 */
export function useTypingField({ scrollTargetRef, enabled = true }: UseTypingFieldOptions) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const isMobile = useRef(
    typeof navigator !== 'undefined' && MOBILE_UA.test(navigator.userAgent)
  ).current

  const focusField = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const blurField = useCallback(() => {
    inputRef.current?.blur()
  }, [])

  const scrollFieldIntoView = useCallback(() => {
    if (!isMobile) return
    scrollTargetRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    })
  }, [isMobile, scrollTargetRef])

  // A software keyboard resizes the visual viewport rather than the window, so
  // this is what actually tells us it opened or closed.
  useEffect(() => {
    if (!isMobile || !enabled || !isFocused) return

    const handleViewportChange = () => scrollFieldIntoView()

    const viewport = window.visualViewport
    if (viewport) {
      viewport.addEventListener('resize', handleViewportChange)
      return () => viewport.removeEventListener('resize', handleViewportChange)
    }

    window.addEventListener('resize', handleViewportChange)
    return () => window.removeEventListener('resize', handleViewportChange)
  }, [isMobile, enabled, isFocused, scrollFieldIntoView])

  return {
    inputRef,
    isMobile,
    isFocused,
    focusField,
    blurField,
    scrollFieldIntoView,
    focusHandlers: {
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
    },
  }
}

export default useTypingField
