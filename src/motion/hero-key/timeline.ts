import type { HeroAspect } from './types'
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
 *   360–431  spell: T, A, P, T, E, S, T
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

const SHOTS: Record<HeroAspect, Record<'logo' | 'faceOn' | 'low' | 'press' | 'keyboard', Shot>> = {
  square: {
    logo: { azimuth: 16, elevation: 62, distance: 4.2, target: [0, 0.22, 0], roll: -9 },
    faceOn: { azimuth: 0, elevation: 86, distance: 3.9, target: [0, 0.22, 0], roll: 0 },
    low: { azimuth: -36, elevation: 16, distance: 3.5, target: [0, 0.24, 0], roll: 0 },
    press: { azimuth: -28, elevation: 32, distance: 3.9, target: [0, 0.16, 0], roll: 0 },
    keyboard: { azimuth: -18, elevation: 50, distance: 22.4, target: [0, 0, 1], roll: 0 },
  },
  portrait: {
    logo: { azimuth: 16, elevation: 62, distance: 4.5, target: [0, 0.22, 0], roll: -9 },
    faceOn: { azimuth: 0, elevation: 86, distance: 4.2, target: [0, 0.22, 0], roll: 0 },
    low: { azimuth: -36, elevation: 16, distance: 3.9, target: [0, 0.24, 0], roll: 0 },
    press: { azimuth: -28, elevation: 32, distance: 4.3, target: [0, 0.16, 0], roll: 0 },
    keyboard: { azimuth: -42, elevation: 60, distance: 21.8, target: [-0.15, 0, 0.45], roll: 0 },
  },
}

/** The camera's moves, as [from frame, to frame, from shot, to shot]. */
const CAMERA_MOVES: [number, number, keyof (typeof SHOTS)['square'], keyof (typeof SHOTS)['square']][] = [
  [90, 134, 'logo', 'faceOn'],
  [134, 180, 'faceOn', 'low'],
  [180, 252, 'low', 'press'],
  [252, 360, 'press', 'keyboard'],
]

function blendShots(a: Shot, b: Shot, t: number): CameraPose {
  return {
    azimuth: lerp(a.azimuth, b.azimuth, t),
    elevation: lerp(a.elevation, b.elevation, t),
    distance: lerp(a.distance, b.distance, t),
    target: [lerp(a.target[0], b.target[0], t), lerp(a.target[1], b.target[1], t), lerp(a.target[2], b.target[2], t)],
    roll: lerp(a.roll, b.roll, t),
    fov: FOV,
  }
}

function cameraAt(frame: number, aspect: HeroAspect): CameraPose {
  const shots = SHOTS[aspect]
  if (frame <= CAMERA_MOVES[0][0]) return blendShots(shots.logo, shots.logo, 0)

  for (const [from, to, a, b] of CAMERA_MOVES) {
    if (frame <= to) {
      // The press beat drifts rather than moves, so it eases gently at both ends.
      const ease = a === 'low' ? easeInOutSine : easeInOutCubic
      return blendShots(shots[a], shots[b], ease(span(frame, from, to)))
    }
  }
  return blendShots(shots.keyboard, shots.keyboard, 0)
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

const SPELL_FIRST = 362
const SPELL_STEP = 10

function spellStarts(letter: string): number[] {
  return SPELLING.split('').flatMap((l, i) => (l === letter ? [SPELL_FIRST + i * SPELL_STEP] : []))
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

export function stateAt(frame: number, aspect: HeroAspect): HeroFrameState {
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
    camera: cameraAt(f, aspect),
    logo,
    glow,
    keys,
    space,
    keyboardShadow: easeInOutSine(span(f, 262, 322)),
  }
}
