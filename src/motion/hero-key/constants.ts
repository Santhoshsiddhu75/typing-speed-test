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
  /** Dark theme only, outside the outline: the dark ground swallows #184034. */
  keyline: '#34D399',
  underside: '#2A803F',
} as const

/**
 * The light wave that loops across the keyboard once it is up (wave.ts):
 * its timing, which the page also needs to drive it.
 */
export const WAVE = {
  /** The band crosses the keyboard in this long… */
  crossSeconds: 1.4,
  /** …then every key rests dark for this long, and it repeats. */
  restSeconds: 0.6,
  /** Fades in this fast once the keyboard is up. */
  fadeSeconds: 0.3,
  /** Half the band's width, in keys. */
  halfWidth: 1.5,
  /** Below this frame the keys are sinking and the wave is gone… */
  fromFrame: 430,
  /** …and from this one they are fully up and it shows in full. */
  fullFrame: 446,
  /** The page draws it at this rate; nothing in it needs more. */
  fps: 30,
} as const

export function frameForProgress(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  return SCROLL_FIRST_FRAME + p * (LAST_FRAME - SCROLL_FIRST_FRAME)
}
