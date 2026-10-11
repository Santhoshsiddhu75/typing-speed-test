/**
 * How the hero visual runs on this device, decided once on load.
 *
 *   live   the 3D scene, loaded after first paint when the browser is idle
 *   still  the landed key as a picture: Save-Data, no WebGL, or the scene failed
 *   final  the finished keyboard as a picture, for a reader who asked for less
 *          motion, so the visual still tells the whole story
 *
 * index.html preloads the same poster by the same rules; change them together.
 */
export type HeroMode = 'live' | 'still' | 'final'

export function initialHeroMode(): HeroMode {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'final'
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return 'still'
  return 'live'
}

/** md and up the visual sits beside the copy at 1:1; under it, on a phone, at 4:5. */
export const SQUARE_QUERY = '(min-width: 768px)'

export function posterSrc(mode: HeroMode, theme: 'light' | 'dark', square: boolean): string {
  const shot = mode === 'final' ? 'keyboard' : 'key'
  return `/hero/${shot}-${theme}-${square ? 'square' : 'portrait'}.webp`
}

/** Probes for WebGL without keeping a context alive. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
