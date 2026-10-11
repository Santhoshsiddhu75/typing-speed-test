/** 1:1 beside the copy from md up; 4:5 under it on a phone. */
export type HeroAspect = 'square' | 'portrait'

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
}
