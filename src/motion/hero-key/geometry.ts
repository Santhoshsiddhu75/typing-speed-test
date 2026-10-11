import { BufferGeometry, Color, ExtrudeGeometry, Float32BufferAttribute, Shape } from 'three'

/**
 * Every keycap here is one profile swept around a rounded rectangle: a list
 * of rings from the base, up the wall, over the bevel and in across the top.
 * One builder gives the taper, the dished face and the well the logo's face
 * sinks into, and stays crisp at any size because nothing is a texture.
 */
export interface Ring {
  /** Half extents and corner radius of the rounded rectangle. */
  hw: number
  hd: number
  r: number
  y: number
  /** Which paint colours the vertices from here on. Defaults to the ring before. */
  tone?: number
  /** Splits the surface here, for a crisp edge or a hard change of colour. */
  hard?: boolean
}

const CORNER_SEGMENTS = 6

/** Counter-clockwise seen from above, so faces wind outward. */
function ringPoints(ring: Ring): [number, number][] {
  const r = Math.max(0, Math.min(ring.r, ring.hw, ring.hd))
  const cx = ring.hw - r
  const cz = ring.hd - r
  const corners: [number, number, number][] = [
    [cx, -cz, 0],
    [-cx, -cz, 90],
    [-cx, cz, 180],
    [cx, cz, 270],
  ]
  const points: [number, number][] = []
  for (const [x, z, start] of corners) {
    for (let i = 0; i <= CORNER_SEGMENTS; i += 1) {
      const a = ((start + (90 * i) / CORNER_SEGMENTS) * Math.PI) / 180
      points.push([x + r * Math.cos(a), z - r * Math.sin(a)])
    }
  }
  return points
}

export function sweep(rings: Ring[]): BufferGeometry {
  const positions: number[] = []
  const tones: number[] = []
  const index: number[] = []
  const count = 4 * (CORNER_SEGMENTS + 1)

  const emit = (ring: Ring, tone: number) => {
    const start = positions.length / 3
    for (const [x, z] of ringPoints(ring)) {
      positions.push(x, ring.y, z)
      tones.push(tone)
    }
    return start
  }

  let previous = -1
  let tone = 0
  rings.forEach((ring, k) => {
    const arriving = emit(ring, ring.hard ? tone : (ring.tone ?? tone))
    if (previous >= 0) {
      for (let j = 0; j < count; j += 1) {
        const j1 = (j + 1) % count
        index.push(previous + j, previous + j1, arriving + j1, previous + j, arriving + j1, arriving + j)
      }
    }
    tone = ring.tone ?? tone
    previous = ring.hard && k < rings.length - 1 ? emit(ring, tone) : arriving
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('tone', new Float32BufferAttribute(tones, 1))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

/** A colour for a vertex, by its position on the key. */
export type Paint = Color | ((x: number, z: number) => Color)

/** Colours a swept geometry by tone. Cheap enough to rerun on a theme change. */
export function paint(geometry: BufferGeometry, paints: Paint[]): void {
  const position = geometry.getAttribute('position')
  const tone = geometry.getAttribute('tone')
  const colours = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i += 1) {
    const p = paints[tone.getX(i)] ?? paints[0]
    const c = typeof p === 'function' ? p(position.getX(i), position.getZ(i)) : p
    colours[i * 3] = c.r
    colours[i * 3 + 1] = c.g
    colours[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
}

/** Rings shrinking toward the centre, each `inset` in from the last outline. */
const inset = (hw: number, hd: number, r: number, by: number) => ({
  hw: hw - by,
  hd: hd - by,
  r: Math.max(0.004, r - by),
})

/** Uniformly scaled toward the centre, so the corners keep their shape. */
const scaled = (hw: number, hd: number, r: number, s: number) => ({ hw: hw * s, hd: hd * s, r: r * s })

// ---------------------------------------------------------------------------
// The plain keys, in the site's own keycap style.

export const PLAIN = {
  half: 0.45,
  height: 0.31,
  /** Half size of the flat top, where the letter sits. */
  top: 0.385,
} as const

export const PLAIN_TONE = { edge: 0, border: 1, face: 2 } as const

/** A plain key `widthInKeys` wide: tapered walls, a soft bevel, a flat top. */
export function plainKey(widthInKeys = 1): BufferGeometry {
  const hw = PLAIN.half + (widthInKeys - 1) / 2
  const hd = PLAIN.half
  const r = 0.12
  const { edge, border, face } = PLAIN_TONE
  return sweep([
    { ...inset(hw, hd, r, 0), y: 0, tone: edge },
    { ...inset(hw, hd, r, 0.035), y: 0.28 },
    { ...inset(hw, hd, r, 0.039), y: 0.295, tone: border },
    { ...inset(hw, hd, r, 0.05), y: 0.306 },
    { ...inset(hw, hd, r, 0.065), y: PLAIN.height },
    { ...inset(hw, hd, r, 0.08), y: PLAIN.height, tone: face },
    { ...inset(hw, hd, r, Math.min(hw, hd)), y: PLAIN.height },
  ])
}

// ---------------------------------------------------------------------------
// The logo key.

export const LOGO_KEY = {
  /** The green layer under the body, and the body's base. */
  underside: { half: 0.49, height: 0.06 },
  half: 0.45,
  /** Top of the body's rim, above the underside. */
  height: 0.335,
  /** The rim's inner edge: the opening the face sits in. */
  opening: 0.355,
  /** How far the face sinks when pressed, and how narrow the well gets there. */
  well: { depth: 0.07, half: 0.28 },
  /** The face at rest, flush with the rim. */
  face: { half: 0.348, top: 0.336, radius: 0.075, dish: 0.016, thickness: 0.04 },
  outline: 0.03,
} as const

export const LOGO_TONE = { wall: 0, rim: 1, well: 2 } as const

/** The body: walls up to a white rim, then the sloped well inside it. */
export function logoBody(): BufferGeometry {
  const { half, height, opening, well } = LOGO_KEY
  const r = 0.13
  const { wall, rim, well: wellTone } = LOGO_TONE
  return sweep([
    { ...inset(half, half, r, 0), y: 0, tone: wall },
    { ...inset(half, half, r, 0.045), y: height - 0.025 },
    { ...inset(half, half, r, 0.054), y: height - 0.009, tone: rim },
    { ...inset(half, half, r, 0.07), y: height },
    { ...inset(half, half, r, half - opening), y: height, hard: true, tone: wellTone },
    { ...inset(half, half, r, half - well.half), y: height - well.depth, hard: true },
    // Then straight down, well below where the sunk face stops, so the
    // floor never covers the face or its T.
    { ...inset(half, half, r, half - well.half), y: height - well.depth - 0.08 },
    { ...inset(half, half, r, half), y: height - well.depth - 0.08 },
  ])
}

/** The green layer the body stands on, visible as the key tilts. */
export function logoUnderside(): BufferGeometry {
  const { half, height } = LOGO_KEY.underside
  const r = 0.15
  return sweep([
    { ...inset(half, half, r, 0), y: 0 },
    { ...inset(half, half, r, 0), y: height - 0.014 },
    { ...inset(half, half, r, 0.012), y: height },
    { ...inset(half, half, r, half), y: height },
  ])
}

/**
 * A shell a little larger than the underside and body together, drawn from
 * the inside only. What shows is a rim around the silhouette from any angle:
 * the logo's thick dark outline.
 */
export function logoOutline(): BufferGeometry {
  const t = LOGO_KEY.outline
  const { underside, half, height } = LOGO_KEY
  const top = underside.height + height
  return sweep([
    { ...inset(underside.half + t, underside.half + t, 0.15 + t, underside.half + t), y: -t },
    { ...inset(underside.half + t, underside.half + t, 0.15 + t, 0), y: -t },
    { ...inset(underside.half + t, underside.half + t, 0.15 + t, 0), y: underside.height },
    { ...inset(half + t, half + t, 0.13 + t, 0.045), y: top - 0.025 },
    { ...inset(half + t, half + t, 0.13 + t, 0.07), y: top + t * 0.6 },
    { ...inset(half + t, half + t, 0.13 + t, half + t), y: top + t * 0.6 },
  ])
}

/** Height of the dished face at (x, z), relative to its rim. */
export function dishAt(x: number, z: number): number {
  const { top, dish } = LOGO_KEY.face
  const s = Math.min(1, Math.max(Math.abs(x), Math.abs(z)) / top)
  return -dish * (1 - s * s)
}

/**
 * The face: its own piece, so it can sink into the well. Origin at its rim.
 * Its sides taper a little more steeply than the well's, so at every depth
 * it sinks to it stays just inside the well rather than cutting through it.
 */
export function logoFace(): BufferGeometry {
  const { half, top, radius, thickness } = LOGO_KEY.face
  const rings: Ring[] = [
    { ...inset(half, half, radius, 1.35 * (thickness - 0.004)), y: -thickness },
    { ...inset(half, half, radius, 0), y: -0.004 },
    { ...inset(half, half, radius, 0.004), y: -0.001 },
  ]
  for (const s of [1, 0.9, 0.75, 0.55, 0.32, 0]) {
    const { hw } = scaled(top, top, radius, s)
    rings.push({ ...scaled(top, top, radius, s), y: dishAt(hw, 0) })
  }
  return sweep(rings)
}

/**
 * Rounds each corner of a polygon with a quadratic curve. The T is drawn as
 * shapes rather than a glyph, so it stays crisp at any size and never
 * depends on a font.
 */
function roundedPolygon(points: [number, number][], radius: number): Shape {
  const shape = new Shape()
  const n = points.length
  const toward = (from: [number, number], to: [number, number], d: number): [number, number] => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1])
    return [from[0] + ((to[0] - from[0]) / len) * d, from[1] + ((to[1] - from[1]) / len) * d]
  }
  points.forEach((p, i) => {
    const prev = points[(i + n - 1) % n]
    const next = points[(i + 1) % n]
    const a = toward(p, prev, radius)
    const b = toward(p, next, radius)
    if (i === 0) shape.moveTo(a[0], a[1])
    else shape.lineTo(a[0], a[1])
    shape.quadraticCurveTo(p[0], p[1], b[0], b[1])
  })
  shape.closePath()
  return shape
}

/**
 * The T, in the logo's proportions: a bar about 43% of the face wide over a
 * stem a little under half its height. Lies on the face, top bar to the back.
 */
export function logoT(): BufferGeometry {
  const bar = { w: 0.29, h: 0.072 }
  const stem = { w: 0.086 }
  const height = 0.33
  const top = height / 2
  const shape = roundedPolygon(
    [
      [-bar.w / 2, top],
      [bar.w / 2, top],
      [bar.w / 2, top - bar.h],
      [stem.w / 2, top - bar.h],
      [stem.w / 2, -top],
      [-stem.w / 2, -top],
      [-stem.w / 2, top - bar.h],
      [-bar.w / 2, top - bar.h],
    ],
    0.009
  )
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 3,
  })
  geometry.rotateX(-Math.PI / 2)

  // Seat it in the dish: every point follows the face's curve, sunk a little.
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    position.setY(i, position.getY(i) + dishAt(x, z) - 0.006)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}
