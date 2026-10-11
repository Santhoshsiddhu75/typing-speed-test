import { clamp01, easeInOutSine, easeOutCubic, lerp, span } from './easing'
import { PLAIN } from './geometry'
import { WAVE } from './constants'

/**
 * The light wave that loops across the keyboard once it is up: a soft band
 * about three keys wide travels left to right along x, lighting every row at
 * the same x, then every key rests dark for a moment, and it goes again.
 *
 * It runs on its own clock, not on scroll, but it is still a pure function:
 * of the frame (it shows only while the keys are up, and fades as they sink)
 * and of the seconds since the keyboard came up. A video render passes the
 * seconds since its own last story frame.
 */

/** The keyboard's extent along x, from the Q's left edge to the P's right. */
const LEFT = -4 - PLAIN.half
const RIGHT = 5 + PLAIN.half

/** How much of the wave shows, 0..1: up with the keys, in over its first 0.3 s. */
export function waveStrength(frame: number, seconds: number): number {
  return easeInOutSine(span(frame, WAVE.fromFrame, WAVE.fullFrame)) * easeOutCubic(clamp01(seconds / WAVE.fadeSeconds))
}

/** Where the band's centre is along x, or null in the dark rest between passes. */
function bandX(seconds: number): number | null {
  const period = WAVE.crossSeconds + WAVE.restSeconds
  const phase = ((seconds % period) + period) % period
  if (phase >= WAVE.crossSeconds) return null
  // From fully off the left end to fully off the right, so each pass starts
  // and ends with every key dark.
  return lerp(LEFT - WAVE.halfWidth, RIGHT + WAVE.halfWidth, phase / WAVE.crossSeconds)
}

/**
 * How lit a key spanning x0..x1 is, 0..1: it eases up as the band reaches
 * it and back down as the band passes.
 */
export function litAt(x0: number, x1: number, seconds: number): number {
  const band = bandX(seconds)
  if (band === null) return 0
  const gap = band < x0 ? x0 - band : band > x1 ? band - x1 : 0
  return easeInOutSine(clamp01(1 - gap / WAVE.halfWidth))
}
