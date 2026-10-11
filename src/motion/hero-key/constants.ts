import type { HeroAspect } from './types'

/** 60 rather than 30, so a scroll scrub has fine steps to land on. */
export const FPS = 60
export const DURATION_IN_FRAMES = 450

/** The key has dropped in and come to rest. The poster is this frame. */
export const LANDED_FRAME = 34
/** The landing press has released and settled; identical to LANDED_FRAME. */
export const INTRO_LAST_FRAME = 89
/** Scroll progress 0 shows this frame, and 1 shows LAST_FRAME. */
export const SCROLL_FIRST_FRAME = 90
export const LAST_FRAME = DURATION_IN_FRAMES - 1

/** Rendered to video at these sizes; on the page only the shape matters. */
export const COMPOSITION_SIZE: Record<HeroAspect, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
}

/**
 * The logo key's own colours, sampled from logounpress.png. They stay the
 * same in both themes: the key is the logo, not a themed control.
 */
export const LOGO = {
  face: '#F4F4F0',
  t: '#227F39',
  tPressed: '#1B6B2F',
  wall: '#B8BFBD',
  /** The sloped frame the face sinks into, seen in logopress.png. */
  well: '#D3D8D6',
  outline: '#184034',
  underside: '#2A803F',
} as const

export function frameForProgress(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  return SCROLL_FIRST_FRAME + p * (LAST_FRAME - SCROLL_FIRST_FRAME)
}
