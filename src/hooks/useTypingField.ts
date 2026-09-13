import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

interface UseTypingFieldOptions {
  /** Scrolled to the top of the screen whenever the software keyboard opens. */
  scrollTargetRef: RefObject<HTMLElement>
  /** Set false once the test is over, so nothing fights the result screen. */
  enabled?: boolean
  /**
   * Refocus if the field loses focus. Correct mid-race, where losing the
   * keyboard costs you the run; wrong on a page someone may just want to
   * scroll.
   */
  holdFocus?: boolean
}

/**
 * The mobile half of a typing field: a hidden input that takes the keystrokes,
 * and the scrolling needed to keep the text visible once the software keyboard
 * covers the bottom of the screen.
 *
 * A phone keyboard resizes the *visual viewport*, not the window, which is why
 * a plain resize listener never notices it opening.
 */
export function useTypingField({
  scrollTargetRef,
  enabled = true,
  holdFocus = false,
}: UseTypingFieldOptions) {
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

  // Mid-race, a stray tap that dismisses the keyboard would otherwise end the
  // run for that player while the clock keeps going.
  useEffect(() => {
    if (!isMobile || !holdFocus || !enabled) return

    const input = inputRef.current
    if (!input) return

    const refocus = () => window.setTimeout(() => inputRef.current?.focus(), 0)
    input.addEventListener('blur', refocus)
    return () => input.removeEventListener('blur', refocus)
  }, [isMobile, holdFocus, enabled])

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
