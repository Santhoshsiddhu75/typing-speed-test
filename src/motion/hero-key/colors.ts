/** An sRGB colour, channels 0..255, with alpha 0..1. */
export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/** Reads `rgb(...)`, `rgba(...)`, `#rgb` and `#rrggbb`, as the site's tokens are written. */
export function parseColor(value: string): Rgba {
  const v = value.trim()

  const fn = v.match(/^rgba?\(([^)]+)\)$/i)
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
  }

  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1]
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    }
  }

  throw new Error(`Unreadable colour: ${value}`)
}

/**
 * A translucent token painted over `under`, as the browser composites it.
 * The dark theme's keycap border, edge and letter are translucent, which
 * means nothing on a 3D surface; this turns them into the solid colour the
 * page actually shows.
 */
export function over(top: Rgba, under: Rgba): Rgba {
  const mix = (t: number, u: number) => Math.round(t * top.a + u * (1 - top.a))
  return { r: mix(top.r, under.r), g: mix(top.g, under.g), b: mix(top.b, under.b), a: 1 }
}

export function toHex({ r, g, b }: Rgba): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')
}

/** Relative luminance, 0..1, for telling the dark ground from the light one. */
export function luminance({ r, g, b }: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
