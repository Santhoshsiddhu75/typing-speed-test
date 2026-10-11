const FONT_FAMILY = '"Fira Code"'
const FONT_WEIGHT = 500

/** Glyphs sit in a grid of cells, padded so neighbours never bleed at small mips. */
export const ATLAS = { cols: 8, rows: 4, cell: 128, fontSize: 88 } as const

/**
 * Every key letter, white on transparent, as raw pixels. Drawn where the
 * page's fonts are (a worker has none), then handed to the scene, which may
 * be running in a worker. The shader colours the letters, so a letter can
 * turn green without a second texture.
 */
export interface GlyphAtlas {
  width: number
  height: number
  /** RGBA, top row first. */
  data: Uint8ClampedArray
  /** [column, row counted from the top] of each letter's cell. */
  cells: Record<string, [number, number]>
}

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

/** Draws the atlas. Call after loadGlyphFont has resolved. */
export function drawGlyphAtlas(letters: string): GlyphAtlas {
  const { cols, rows, cell, fontSize } = ATLAS
  const canvas = document.createElement('canvas')
  canvas.width = cols * cell
  canvas.height = rows * cell
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No 2D canvas')

  ctx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  const cells: Record<string, [number, number]> = {}
  letters.split('').forEach((letter, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    // Centre each capital on its own ink, not on the em box, so every
    // letter sits at the same optical height on its key.
    const m = ctx.measureText(letter)
    const inkMiddle = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
    ctx.fillText(letter, col * cell + cell / 2, row * cell + cell / 2 + inkMiddle)
    cells[letter] = [col, row]
  })

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { width: canvas.width, height: canvas.height, data, cells }
}
