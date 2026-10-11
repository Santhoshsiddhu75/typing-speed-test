/**
 * The keyboard the logo key belongs to: three letter rows of QWERTY and a
 * space bar, in key units (1 = one key's pitch). The logo key is the T, so
 * the T sits at the origin and the rest are laid out around it. +z runs
 * toward the viewer, from the top row to the space bar.
 */
export interface KeySlot {
  letter: string
  x: number
  z: number
  /** Distance from the T, which sets when the key rises in the wave. */
  distance: number
}

const ROWS: { letters: string; x: number; z: number }[] = [
  { letters: 'QWERTYUIOP', x: -4, z: 0 },
  { letters: 'ASDFGHJKL', x: -3.75, z: 1 },
  { letters: 'ZXCVBNM', x: -3.25, z: 2 },
]

/** Every letter key except the T, which is the logo key. */
export const KEY_SLOTS: KeySlot[] = ROWS.flatMap((row) =>
  row.letters
    .split('')
    .map((letter, index) => ({ letter, x: row.x + index, z: row.z }))
    .filter((slot) => slot.letter !== 'T')
    .map((slot) => ({ ...slot, distance: Math.hypot(slot.x, slot.z) }))
)

export const SPACE = { x: 0.5, z: 3, width: 5, distance: Math.hypot(0.5, 3) }

/** The letters the logo key does not carry, for the glyph atlas. */
export const LETTERS = KEY_SLOTS.map((slot) => slot.letter).join('')

/** Centre of the letter rows, and of the rows plus the space bar. */
export const KEYBOARD_CENTRE = { x: 0.5, z: 1 }
export const KEYBOARD_CENTRE_WITH_SPACE = { x: 0.5, z: 1.5 }
