import { DifficultyLevel, TimerOption } from '@/types'
import { PASSAGES } from './passages'

/**
 * Words handed to the test, generously above what anyone can actually type in
 * the time. The screen caps input at the length of this text, so these need
 * headroom: at 200 words a one minute test would silently cap a fast typist
 * at 200 WPM rather than letting them finish.
 */
const WORD_TARGETS: Record<TimerOption, number> = {
  1: 220,
  2: 400,
  5: 900,
}

const DEFAULT_WORD_TARGET = 220

type Rng = () => number

/**
 * mulberry32. Small, fast, and — the reason it is here — identical on every
 * machine for a given seed, so two players handed the same seed build the same
 * test from the same passage library without a word crossing the wire.
 */
function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates, on a copy — the exported pools are never mutated. */
function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Easy mode drops capitals and punctuation, so beginners never reach for the
 * shift key. The passages still read as sentences; they just lose their marks.
 */
function formatForDifficulty(passage: string, difficulty: DifficultyLevel): string {
  if (difficulty !== 'easy') return passage

  return passage
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Builds a test by stitching whole passages together in random order until the
 * target is met. Passages are drawn without replacement so a single test never
 * repeats itself, and the deck reshuffles if a long test exhausts the pool.
 *
 * Pass a seed and the result is deterministic: the same seed, difficulty and
 * timer always produce the same test. That is what lets two players in a race
 * type identical text without the server shipping them a thousand words.
 *
 * Whole passages only — the previous implementation sliced the final sentence
 * to hit an exact count, which left every test ending on a fragment. Landing
 * slightly over the target costs nothing, since unused words are simply never
 * reached.
 */
export function getRandomText(
  difficulty: DifficultyLevel,
  timer: TimerOption,
  seed?: number
): string {
  const target = WORD_TARGETS[timer] ?? DEFAULT_WORD_TARGET
  const pool = PASSAGES[difficulty]
  const rng: Rng = seed === undefined ? Math.random : seededRng(seed)

  if (!pool || pool.length === 0) return ''

  const chosen: string[] = []
  let total = 0
  let deck = shuffled(pool, rng)
  let next = 0

  while (total < target) {
    if (next >= deck.length) {
      deck = shuffled(pool, rng)
      next = 0
    }

    const passage = formatForDifficulty(deck[next], difficulty)
    next += 1

    chosen.push(passage)
    total += countWords(passage)
  }

  return chosen.join(' ')
}
