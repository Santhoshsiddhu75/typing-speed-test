import type { HeroAspect, HeroFraming } from './types'
import { KEY_SLOTS, SPACE } from './layout'
import {
  clamp01,
  easeInOutCubic,
  easeInOutSine,
  easeInQuad,
  easeOutBack,
  easeOutCubic,
  lerp,
  span,
} from './easing'

/**
 * The whole story as numbers. Everything here is a pure function of the
 * frame and the aspect: no clocks, no randomness, no state carried between
 * frames. Scrubbing backwards therefore plays it backwards, and a video
 * render gets exactly what the page shows. Scroll covers 90–449, and the
 * story fills all of it, ending with the keyboard fully up at the last frame.
 *
 *   0–34     the key drops in with a quarter-turn and lands (video only)
 *   34–89    it presses once on landing and releases
 *   90–214   turn: logo pose → face on → low three-quarter view
 *   214–300  press: all the way down, held; a green light spreads under it
 *   300–449  open out: the keyboard rises around it in a wave from the T
 *
 * Once the keyboard is up, the light wave in wave.ts runs on its own clock.
 */

export interface CameraPose {
  /** Degrees around the key; 0 looks from the front (+z), positive from the right. */
  azimuth: number
  /** Degrees above the ground. */
  elevation: number
  distance: number
  target: [number, number, number]
  /** Degrees around the line of sight. */
  roll: number
  /** Lens shift, as a share of half the frame: moves the picture, not the view. */
  shift: [number, number]
  /** Vertical field of view, degrees. */
  fov: number
}

export interface KeyState {
  /** Height above its resting place; negative is still below the ground. */
  rise: number
}

export interface HeroFrameState {
  camera: CameraPose
  logo: {
    /** Height above its resting place, while it drops in. */
    lift: number
    /** Degrees, for the quarter-turn on the way down. */
    yaw: number
    /** 0 at rest, 1 all the way down. Dips below 0 on a springy release. */
    press: number
  }
  /** 0..1, the green light on the ground under the pressed key. */
  glow: number
  /** One per entry in KEY_SLOTS. */
  keys: KeyState[]
  /** Null where the frame is too narrow for one. */
  space: KeyState | null
  /** 0..1, the soft shadow under the whole keyboard. */
  keyboardShadow: number
}

type Shot = Omit<CameraPose, 'fov'>

const FOV = 30
const NO_SHIFT: [number, number] = [0, 0]

/** The key's own beats: the same whichever way the story ends. */
const KEY_SHOTS: Record<HeroAspect, Record<'logo' | 'faceOn' | 'low' | 'press', Shot>> = {
  square: {
    logo: { azimuth: 16, elevation: 62, distance: 4.2, target: [0, 0.22, 0], roll: -9, shift: NO_SHIFT },
    faceOn: { azimuth: 0, elevation: 86, distance: 3.9, target: [0, 0.22, 0], roll: 0, shift: NO_SHIFT },
    low: { azimuth: -36, elevation: 16, distance: 3.5, target: [0, 0.24, 0], roll: 0, shift: NO_SHIFT },
    press: { azimuth: -28, elevation: 32, distance: 3.9, target: [0, 0.16, 0], roll: 0, shift: NO_SHIFT },
  },
  portrait: {
    // Up and a little left of centre, clear of the floating button that
    // sits in a phone's bottom-right corner.
    logo: { azimuth: 16, elevation: 62, distance: 4.6, target: [0, 0.22, 0], roll: -9, shift: [-0.07, 0.2] },
    faceOn: { azimuth: 0, elevation: 86, distance: 4.2, target: [0, 0.22, 0], roll: 0, shift: [0, 0.06] },
    low: { azimuth: -36, elevation: 16, distance: 3.9, target: [0, 0.24, 0], roll: 0, shift: NO_SHIFT },
    press: { azimuth: -28, elevation: 32, distance: 4.3, target: [0, 0.16, 0], roll: 0, shift: NO_SHIFT },
  },
}

/**
 * Where the story ends up, and stays. Whole: the finished keyboard filling
 * the frame, for a desktop column wide enough to read it. Close: near enough
 * that a key is about 44px wide on a phone, with the keyboard running off the
 * edges; it looks a little left of the T, over the A, S, E and T.
 */
const KEYBOARD_SHOTS: Record<HeroAspect, Record<HeroFraming, Shot>> = {
  square: {
    whole: { azimuth: -14, elevation: 56, distance: 18.6, target: [0.1, 0, 1.05], roll: 0, shift: NO_SHIFT },
    close: { azimuth: -24, elevation: 54, distance: 13.2, target: [-1.9, 0, 0.8], roll: 0, shift: NO_SHIFT },
  },
  portrait: {
    whole: { azimuth: -42, elevation: 60, distance: 21.8, target: [-0.15, 0, 0.45], roll: 0, shift: NO_SHIFT },
    close: { azimuth: -26, elevation: 54, distance: 13.2, target: [-1.9, 0, 0.8], roll: 0, shift: NO_SHIFT },
  },
}

function blendShots(a: Shot, b: Shot, t: number): CameraPose {
  return {
    azimuth: lerp(a.azimuth, b.azimuth, t),
    elevation: lerp(a.elevation, b.elevation, t),
    distance: lerp(a.distance, b.distance, t),
    target: [lerp(a.target[0], b.target[0], t), lerp(a.target[1], b.target[1], t), lerp(a.target[2], b.target[2], t)],
    roll: lerp(a.roll, b.roll, t),
    shift: [lerp(a.shift[0], b.shift[0], t), lerp(a.shift[1], b.shift[1], t)],
    fov: FOV,
  }
}

function cameraAt(frame: number, aspect: HeroAspect, framing: HeroFraming): CameraPose {
  const shots = KEY_SHOTS[aspect]
  const end = KEYBOARD_SHOTS[aspect][framing]

  if (frame <= 90) return blendShots(shots.logo, shots.logo, 0)
  if (frame <= 150) return blendShots(shots.logo, shots.faceOn, easeInOutCubic(span(frame, 90, 150)))
  if (frame <= 214) return blendShots(shots.faceOn, shots.low, easeInOutCubic(span(frame, 150, 214)))
  // The press beat drifts rather than moves, so it eases gently at both ends.
  if (frame <= 300) return blendShots(shots.low, shots.press, easeInOutSine(span(frame, 214, 300)))
  return blendShots(shots.press, end, easeInOutCubic(span(frame, 300, 449)))
}

/**
 * A key going down and coming back up: `down` frames to the bottom, held for
 * `hold`, then `up` frames back. `overshoot` lets the release spring past
 * the resting height before it settles.
 */
function pressCurve(frame: number, start: number, down: number, hold: number, up: number, overshoot = 0): number {
  const t = frame - start
  if (t <= 0) return 0
  if (t < down) return easeOutCubic(t / down)
  if (t < down + hold) return 1
  const r = clamp01((t - down - hold) / up)
  return overshoot > 0 ? 1 - easeOutBack(r, overshoot) : 1 - easeInOutSine(r)
}

const RISE_DEPTH = 0.75

/** Keys rise in a wave out from the T; the farthest is up, and settled, by 444. */
function riseAt(frame: number, distance: number): number {
  const start = 318 + distance * 14
  const t = span(frame, start, start + 56)
  return -RISE_DEPTH * (1 - easeOutBack(t, 1.6))
}

/** Two presses that never overlap: on landing, and the press beat. */
function logoPressAt(frame: number): number {
  const landing = pressCurve(frame, 34, 7, 6, 25, 1.2)

  // Down and held, then released as the keyboard rises around it.
  let beat = 0
  if (frame > 214 && frame <= 300) beat = easeInOutCubic(span(frame, 214, 230))
  else if (frame > 300) beat = 1 - easeOutBack(span(frame, 300, 320), 1.4)

  return landing + beat
}

export function stateAt(frame: number, aspect: HeroAspect, framing: HeroFraming): HeroFrameState {
  const f = Math.min(Math.max(frame, 0), 449)

  const drop = span(f, 0, 34)
  const logo = {
    lift: 3.4 * (1 - easeInQuad(drop)),
    yaw: -90 * (1 - easeOutCubic(drop)),
    press: logoPressAt(f),
  }

  const glow = f < 238 ? easeOutCubic(span(f, 222, 238)) : 1 - easeInOutSine(span(f, 238, 290))

  return {
    camera: cameraAt(f, aspect, framing),
    logo,
    glow,
    keys: KEY_SLOTS.map((slot) => ({ rise: riseAt(f, slot.distance) })),
    space: aspect === 'portrait' ? null : { rise: riseAt(f, SPACE.distance) },
    keyboardShadow: easeInOutSine(span(f, 330, 440)),
  }
}
