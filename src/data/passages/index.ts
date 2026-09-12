import { DifficultyLevel } from '@/types'
import { EASY_PASSAGES } from './easy'
import { MEDIUM_PASSAGES } from './medium'
import { HARD_PASSAGES } from './hard'

/**
 * Difficulty in this app means word length, so each pool is held to an average
 * measured in characters per word — roughly 3.8, 5.9 and 8.0, about two
 * characters apart per tier.
 *
 * The bands themselves live in `scripts/check-passages.mjs` rather than here,
 * since nothing at runtime reads them and a second copy would only drift.
 * Run `npm run check:passages` after adding passages.
 */
export const PASSAGES: Record<DifficultyLevel, string[]> = {
  easy: EASY_PASSAGES,
  medium: MEDIUM_PASSAGES,
  hard: HARD_PASSAGES,
}

export { EASY_PASSAGES, MEDIUM_PASSAGES, HARD_PASSAGES }
