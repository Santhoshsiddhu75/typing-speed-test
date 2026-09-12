#!/usr/bin/env node
/**
 * Checks every passage against its difficulty's average-word-length band.
 *
 * Difficulty in this app means word length, so the bands are the actual
 * specification — without a check, prose written months apart drifts and the
 * tiers stop differing in the way the setup screen promises.
 *
 * Usage: npm run check:passages
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const passagesDir = join(root, 'src', 'data', 'passages')

const BANDS = {
  easy: { min: 3.3, max: 4.5 },
  medium: { min: 5.0, max: 7.0 },
  hard: { min: 7.2, max: 9.3 },
}

/** Pulls the single-quoted entries out of an exported string array. */
function readPassages(difficulty) {
  const source = readFileSync(join(passagesDir, `${difficulty}.ts`), 'utf8')
  const body = source.slice(source.indexOf('['), source.lastIndexOf(']'))
  return [...body.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((match) => match[1])
}

function averageWordLength(passage) {
  const words = passage
    .replace(/[^A-Za-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 0
  const letters = words.reduce((sum, word) => sum + word.length, 0)
  return letters / words.length
}

let failures = 0

for (const [difficulty, band] of Object.entries(BANDS)) {
  const passages = readPassages(difficulty)
  const averages = passages.map(averageWordLength)
  const wordCounts = passages.map((p) => p.split(/\s+/).filter(Boolean).length)

  const mean = averages.reduce((a, b) => a + b, 0) / averages.length
  const totalWords = wordCounts.reduce((a, b) => a + b, 0)
  const outOfBand = averages
    .map((avg, index) => ({ avg, index }))
    .filter(({ avg }) => avg < band.min || avg > band.max)

  console.log(
    `${difficulty.padEnd(6)} ${String(passages.length).padStart(3)} passages  ` +
      `avg ${mean.toFixed(2)} chars/word  (band ${band.min}-${band.max})  ` +
      `${totalWords} words  ${Math.min(...wordCounts)}-${Math.max(...wordCounts)} per passage`
  )

  for (const { avg, index } of outOfBand) {
    failures += 1
    console.log(
      `  out of band: #${index} at ${avg.toFixed(2)} — "${passages[index].slice(0, 60)}..."`
    )
  }
}

if (failures > 0) {
  console.log(`\n${failures} passage(s) outside their band.`)
  process.exit(1)
}

console.log('\nAll passages within band.')
