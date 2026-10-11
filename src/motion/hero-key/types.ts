/** 1:1 beside the copy from md up; 4:5 under it on a phone. */
export type HeroAspect = 'square' | 'portrait'

/**
 * How the story ends. Whole: the finished keyboard fills the frame, for a
 * desktop column. Close: the camera stays near enough for the keys to read
 * on a phone or tablet, and follows the presses.
 */
export type HeroFraming = 'whole' | 'close'

/**
 * The site's tokens, exactly as CSS holds them: `rgb(...)`, `rgba(...)` or
 * hex. Translucent ones are fine; the scene composites them itself, the way
 * the browser would over the page.
 */
export interface HeroKeyColors {
  background: string
  primary: string
  keycapA: string
  keycapB: string
  keycapBorder: string
  keycapEdge: string
  keycapLetter: string
  keycapShadow: string
}

/** Everything the scene depends on besides the frame number. */
export interface HeroKeyProps {
  colors: HeroKeyColors
  aspect: HeroAspect
  framing: HeroFraming
}
