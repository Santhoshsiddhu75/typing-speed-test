import { CanvasTexture } from 'three'
import { KEY_SLOTS, SPACE } from './layout'
import { PLAIN } from './geometry'

/**
 * Drawn rather than rendered: the soft shadows and the green light are
 * white-on-transparent canvases tinted by their materials. A shadow pass
 * would re-render the scene on every frame; these cost nothing per frame and
 * come out the same every time.
 */

/** An OffscreenCanvas where there is one, so this also runs in a worker. */
function canvas2d(width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (ctx) return { canvas, ctx }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D canvas')
  return { canvas, ctx }
}

/** A round soft spot, opaque in the middle and gone at the edge. */
export function softSpot(falloff = 1): CanvasTexture {
  const size = 128
  const { canvas, ctx } = canvas2d(size, size)
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35 * falloff, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

/** World-space rectangle the keyboard's shadow texture covers. */
export interface ShadowBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/**
 * Every plain key's footprint, blurred, in one texture: overlapping edges add
 * up, so the shadow darkens where keys sit close, as a contact shadow does.
 */
export function keyboardShadow(withSpace: boolean): { texture: CanvasTexture; bounds: ShadowBounds } {
  const margin = 0.7
  const bounds: ShadowBounds = {
    minX: -4 - PLAIN.half - margin,
    maxX: 5 + PLAIN.half + margin,
    minZ: -PLAIN.half - margin,
    maxZ: (withSpace ? SPACE.z : 2) + PLAIN.half + margin,
  }
  const scale = 40
  const width = Math.ceil((bounds.maxX - bounds.minX) * scale)
  const height = Math.ceil((bounds.maxZ - bounds.minZ) * scale)
  const { canvas, ctx } = canvas2d(width, height)

  // The usual trick for a blurred shape on every browser, including Safari
  // without canvas filters: draw it off the canvas and let only its shadow,
  // offset back on, land.
  ctx.shadowColor = 'rgba(255,255,255,0.5)'
  ctx.shadowBlur = 0.32 * scale
  ctx.shadowOffsetX = width
  ctx.fillStyle = '#ffffff'

  const footprint = (x: number, z: number, keysWide: number) => {
    const hw = (PLAIN.half + (keysWide - 1) / 2) * scale
    const hd = PLAIN.half * scale
    const cx = (x - bounds.minX) * scale - width
    const cz = (z - bounds.minZ) * scale
    // arcTo rather than roundRect, which Safari before 16 does not have.
    const r = 0.12 * scale
    const [l, t, rt, b] = [cx - hw, cz - hd, cx + hw, cz + hd]
    ctx.beginPath()
    ctx.moveTo(l + r, t)
    ctx.arcTo(rt, t, rt, b, r)
    ctx.arcTo(rt, b, l, b, r)
    ctx.arcTo(l, b, l, t, r)
    ctx.arcTo(l, t, rt, t, r)
    ctx.closePath()
    ctx.fill()
  }

  for (const slot of KEY_SLOTS) footprint(slot.x, slot.z, 1)
  if (withSpace) footprint(SPACE.x, SPACE.z, SPACE.width)

  return { texture: new CanvasTexture(canvas), bounds }
}
