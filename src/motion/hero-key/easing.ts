export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t

/** Where `frame` sits between `from` and `to`, clamped to 0..1. */
export const span = (frame: number, from: number, to: number) => clamp01((frame - from) / (to - from))

export const easeInQuad = (t: number) => t * t
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/** Overshoots past 1 and comes back; `s` sets how far. */
export const easeOutBack = (t: number, s = 1.70158) => {
  const u = t - 1
  return 1 + (s + 1) * u * u * u + s * u * u
}
