import type { GlyphAtlas, HeroKeyProps } from '@/motion/hero-key'

/** The canvas's CSS size, and the pixel ratio to draw it at. */
export interface CanvasSize {
  width: number
  height: number
  pixelRatio: number
}

/** What the page tells the hero's render worker. */
export type ToHeroWorker =
  | {
      type: 'init'
      canvas: OffscreenCanvas
      props: HeroKeyProps
      glyphs: GlyphAtlas
      size: CanvasSize
      frame: number
    }
  | { type: 'frame'; frame: number }
  | { type: 'props'; props: HeroKeyProps }
  | { type: 'size'; size: CanvasSize }

/** What it answers: once when its first frame is drawn, or with what went wrong. */
export type FromHeroWorker = { type: 'ready' } | { type: 'error'; message: string }
