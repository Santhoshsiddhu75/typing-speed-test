import { CanvasTexture } from 'three'

const FONT_FAMILY = '"Fira Code"'
const FONT_WEIGHT = 500

/** Glyphs sit in a grid of cells, padded so neighbours never bleed at small mips. */
export const ATLAS = { cols: 8, rows: 4, cell: 128, fontSize: 88 } as const

/**
 * Loads Fira Code 500 for exactly these letters, or throws. `fonts.ready`
 * is not enough: it only waits for faces the page has already asked for,
 * and a canvas asking for a face that has not loaded silently draws in a
 * fallback. Here an empty result means no web font matched, so nothing is
 * drawn rather than drawn wrong.
 */
export async function loadGlyphFont(letters: string): Promise<void> {
  const font = `${FONT_WEIGHT} ${ATLAS.fontSize}px ${FONT_FAMILY}`
  const faces = await document.fonts.load(font, letters)
  if (faces.length === 0) throw new Error('Fira Code is not available')
}

/**
 * One texture holding every key letter, white on transparent: the shader
 * colours them, so a letter can turn green without a second texture.
 */
export function glyphAtlas(letters: string): { texture: CanvasTexture; cell: (letter: string) => [number, number] } {
  const { cols, rows, cell, fontSize } = ATLAS
  const canvas = document.createElement('canvas')
  canvas.width = cols * cell
  canvas.height = rows * cell
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D canvas')

  ctx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  const cells = new Map<string, [number, number]>()
  letters.split('').forEach((letter, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    // Centre each capital on its own ink, not on the em box, so every
    // letter sits at the same optical height on its key.
    const m = ctx.measureText(letter)
    const inkMiddle = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
    ctx.fillText(letter, col * cell + cell / 2, row * cell + cell / 2 + inkMiddle)
    cells.set(letter, [col, rows - 1 - row])
  })

  const texture = new CanvasTexture(canvas)
  return { texture, cell: (letter) => cells.get(letter) ?? [0, 0] }
}
