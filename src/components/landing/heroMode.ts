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

/**
 * Wide enough to show the whole finished keyboard with its letters readable.
 * Narrower, on phones and tablets, the camera stays close for the spell.
 */
export const WHOLE_QUERY = '(min-width: 1024px)'

export function posterSrc(mode: HeroMode, theme: 'light' | 'dark', square: boolean): string {
  const shot = mode === 'final' ? 'keyboard' : 'key'
  return `/hero/${shot}-${theme}-${square ? 'square' : 'portrait'}.webp`
}

/** True if this canvas gives a WebGL context. The probe context is released at once. */
function webgl(canvas: HTMLCanvasElement | OffscreenCanvas): boolean {
  try {
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

/**
 * Where the 3D can run here: in a worker when the browser draws WebGL on an
 * OffscreenCanvas (Chrome, Firefox, Safari 17 and later), on the main thread
 * when it only has WebGL on a page canvas (older Safari), or nowhere.
 *
 * The page canvas is asked first. Chrome's switch for turning WebGL off
 * leaves it working on OffscreenCanvas, and a reader who has turned it off
 * should get the poster, not WebGL through a side door.
 */
export function webglSupport(): 'worker' | 'main' | null {
  if (!webgl(document.createElement('canvas'))) return null
  const offscreen =
    typeof OffscreenCanvas !== 'undefined' &&
    typeof Worker !== 'undefined' &&
    'transferControlToOffscreen' in HTMLCanvasElement.prototype
  return offscreen && webgl(new OffscreenCanvas(1, 1)) ? 'worker' : 'main'
}
