/**
 * The hero's 3D logo key. Self-contained: it takes theme colours and an
 * aspect as props and imports nothing from the app, so the same scene can be
 * rendered to video for social posts.
 */
export { createHeroKeyScene } from './scene'
export { drawGlyphAtlas, loadGlyphFont } from './glyphs'
export type { GlyphAtlas } from './glyphs'
export { LETTERS } from './layout'
export type { HeroKeyScene } from './scene'
export type { HeroAspect, HeroFraming, HeroKeyColors, HeroKeyProps } from './types'
export {
  COMPOSITION_SIZE,
  DURATION_IN_FRAMES,
  FPS,
  INTRO_LAST_FRAME,
  LANDED_FRAME,
  LAST_FRAME,
  SCROLL_FIRST_FRAME,
  frameForProgress,
} from './constants'
