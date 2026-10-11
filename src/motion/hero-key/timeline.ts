import type { HeroAspect, HeroFraming } from './types'
import { KEY_SLOTS, SPACE, SPELLING } from './layout'
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
 * render gets exactly what the page shows.
 *
 *   0–34     the key drops in with a quarter-turn and lands (video only)
 *   34–89    it presses once on landing and releases
 *   90–179   turn: logo pose → face on → low three-quarter view
 *   180–251  press: all the way down, held; a green light spreads under it
 *   252–359  open out: the keyboard rises around it in a wave from the T
 *   360–431  spell: T, A, P, T, E, S, T, followed close in on a phone
 *   432–449  rest
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
  /** 0 at rest, 1 all the way down. Dips below 0 on a springy release. */
  press: number
  /** 0 → 1 as its letter turns signature green. */
  green: number
}

export interface HeroFrameState {
  camera: CameraPose
  logo: {
    /** Height above its resting place, while it drops in. */
    lift: number
    /** Degrees, for the quarter-turn on the way down. */
    yaw: number
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
 * Where the story ends up. Whole: the finished keyboard filling the frame,
 * for a desktop column wide enough to read it. Close: in near enough that a
 * pressed key is about 44px wide on a phone, with the keyboard running off
 * the edges and the camera following the presses along the rows.
 */
const KEYBOARD_SHOTS: Record<HeroAspect, Record<HeroFraming, Shot>> = {
  square: {
    whole: { azimuth: -14, elevation: 56, distance: 18.6, target: [0.1, 0, 1.05], roll: 0, shift: NO_SHIFT },
    close: { azimuth: -24, elevation: 54, distance: 13.2, target: [0, 0, 0.8], roll: 0, shift: NO_SHIFT },
  },
  portrait: {
    whole: { azimuth: -42, elevation: 60, distance: 21.8, target: [-0.15, 0, 0.45], roll: 0, shift: NO_SHIFT },
    close: { azimuth: -26, elevation: 54, distance: 13.2, target: [0, 0, 0.8], roll: 0, shift: NO_SHIFT },
  },
}

/** The spell's presses, timed so a camera following them has time to arrive. */
const SPELL_FRAMES = [362, 369, 386, 397, 406, 414, 422]

/**
 * Close in, the camera's sideways drift along the rows, as [frame, x]. It
 * arrives just before each press and holds until the key is all the way
 * down, so no key is pressed while the frame is still moving. The P, at the
 * far right, gets the longest move, there and back.
 */
const FOLLOW: [number, number][] = [
  [360, -0.6],
  [366, -2.6],
  [373, -2.6],
  [383, 3.4],
  [390, 3.4],
  [395, 0.6],
  [401, 0.6],
  [404, -1.4],
  [409, -1.4],
  [412, -1.8],
  [417, -1.8],
  [420, -1.9],
]

function followX(frame: number): number {
  if (frame <= FOLLOW[0][0]) return FOLLOW[0][1]
  for (let i = 1; i < FOLLOW.length; i += 1) {
    const [f0, x0] = FOLLOW[i - 1]
    const [f1, x1] = FOLLOW[i]
    if (frame <= f1) return lerp(x0, x1, easeInOutSine(span(frame, f0, f1)))
  }
  return FOLLOW[FOLLOW.length - 1][1]
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

/** The end shot, moved along the rows by `x`. */
const along = (shot: Shot, x: number): Shot => ({
  ...shot,
  target: [shot.target[0] + x, shot.target[1], shot.target[2]],
})

function cameraAt(frame: number, aspect: HeroAspect, framing: HeroFraming): CameraPose {
  const shots = KEY_SHOTS[aspect]
  const end = KEYBOARD_SHOTS[aspect][framing]
  const close = framing === 'close'
  const ending = close ? along(end, FOLLOW[0][1]) : end
  const hold = (shot: Shot) => blendShots(shot, shot, 0)

  if (frame <= 90) return hold(shots.logo)
  if (frame <= 134) return blendShots(shots.logo, shots.faceOn, easeInOutCubic(span(frame, 90, 134)))
  if (frame <= 180) return blendShots(shots.faceOn, shots.low, easeInOutCubic(span(frame, 134, 180)))
  // The press beat drifts rather than moves, so it eases gently at both ends.
  if (frame <= 252) return blendShots(shots.low, shots.press, easeInOutSine(span(frame, 180, 252)))
  if (frame <= 360) return blendShots(shots.press, ending, easeInOutCubic(span(frame, 252, 360)))
  return hold(close ? along(end, followX(frame)) : end)
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

function spellStarts(letter: string): number[] {
  return SPELLING.split('').flatMap((l, i) => (l === letter ? [SPELL_FRAMES[i]] : []))
}

function spellPress(frame: number, letter: string): number {
  return Math.max(0, ...spellStarts(letter).map((start) => pressCurve(frame, start, 3, 1, 6)))
}

function spellGreen(frame: number, letter: string): number {
  const starts = spellStarts(letter)
  return starts.length ? span(frame, starts[0], starts[0] + 3) : 0
}

const RISE_DEPTH = 0.75

function riseAt(frame: number, distance: number): number {
  const start = 256 + distance * 7
  const t = span(frame, start, start + 34)
  return -RISE_DEPTH * (1 - easeOutBack(t, 1.6))
}

/** Three presses that never overlap: on landing, the press beat, and the Ts. */
function logoPressAt(frame: number): number {
  const landing = pressCurve(frame, 34, 7, 6, 25, 1.2)

  // Down and held, then released as the keyboard rises so it can press again.
  let beat = 0
  if (frame > 180 && frame <= 252) beat = easeInOutCubic(span(frame, 180, 196))
  else if (frame > 252) beat = 1 - easeOutBack(span(frame, 252, 272), 1.4)

  return landing + beat + spellPress(frame, 'T')
}

export function stateAt(frame: number, aspect: HeroAspect, framing: HeroFraming): HeroFrameState {
  const f = Math.min(Math.max(frame, 0), 449)

  const drop = span(f, 0, 34)
  const logo = {
    lift: 3.4 * (1 - easeInQuad(drop)),
    yaw: -90 * (1 - easeOutCubic(drop)),
    press: logoPressAt(f),
  }

  const glow = f < 204 ? easeOutCubic(span(f, 188, 204)) : 1 - easeInOutSine(span(f, 204, 250))

  const keys = KEY_SLOTS.map((slot) => ({
    rise: riseAt(f, slot.distance),
    press: spellPress(f, slot.letter),
    green: spellGreen(f, slot.letter),
  }))

  const space = aspect === 'portrait' ? null : { rise: riseAt(f, SPACE.distance), press: 0, green: 0 }

  return {
    camera: cameraAt(f, aspect, framing),
    logo,
    glow,
    keys,
    space,
    keyboardShadow: easeInOutSine(span(f, 262, 322)),
  }
}
