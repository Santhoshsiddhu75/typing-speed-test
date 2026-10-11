import type { HeroKeyColors } from '@/motion/hero-key'

/**
 * The theme's tokens as the page currently has them. Read live, because the
 * theme is a class on <html> that can change at any moment.
 */
export function readHeroColors(): HeroKeyColors {
  const style = getComputedStyle(document.documentElement)
  const token = (name: string) => style.getPropertyValue(name).trim()
  return {
    background: token('--background'),
    primary: token('--primary'),
    keycapA: token('--keycap-a'),
    keycapB: token('--keycap-b'),
    keycapBorder: token('--keycap-border'),
    keycapEdge: token('--keycap-edge'),
    keycapLetter: token('--keycap-letter'),
    keycapShadow: token('--keycap-shadow'),
  }
}
