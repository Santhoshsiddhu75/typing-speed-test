// Captures the home page hero's posters from the built site: the frames the
// 3D scene shows at the end of its intro (the landed key) and at the end of
// the story (the keyboard), in both themes and both aspects, as transparent
// WebP under public/hero/. The page shows a poster until the scene is ready,
// and instead of it under reduced motion, Save-Data or no WebGL, so these
// must be redone whenever the scene's look or framing changes.
//
//   npm run build && npx vite preview --port 4173
//   node scripts/capture-hero-posters.mjs [http://localhost:4173]
//
// Then build again, so dist carries the new posters.

import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'hero')
const MAX_BYTES = 40 * 1024

// Square is captured where the hero pins, portrait at a phone's width. The
// portrait canvas draws at most 1.5× on a phone, so its poster is taken at
// 1.5× too: 2× would only upscale the same pixels into a heavier file.
const ASPECTS = {
  square: { viewport: { width: 1280, height: 800 }, scale: 2 },
  portrait: { viewport: { width: 390, height: 1000 }, scale: 1.5 },
}

/** The scroll position where the hero's progress reaches p. Read at the top of the page. */
function scrollFor(p) {
  const root = document.getElementById('root')
  const pin = document.querySelector('.tt-hero-pin')
  const at = (el) => el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
  if (pin.classList.contains('is-pinned')) {
    return at(pin) + p * (pin.offsetHeight - pin.querySelector('.tt-hero').offsetHeight)
  }
  const navBottom = document.querySelector('header').getBoundingClientRect().bottom
  return p * (at(document.querySelector('.tt-hero-box')) - navBottom)
}

async function encodeWebp(browser, png) {
  const page = await browser.newPage()
  const result = await page.evaluate(
    async ({ data, max }) => {
      const img = new Image()
      img.src = data
      await img.decode()
      // Full size first, giving up some quality; past that, a slightly
      // smaller poster looks better than a blotchy one.
      let last
      for (const size of [1, 0.9, 0.8, 0.7, 0.62]) {
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.naturalWidth * size)
        canvas.height = Math.round(img.naturalHeight * size)
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        for (let quality = 0.86; quality >= 0.58; quality -= 0.04) {
          const url = canvas.toDataURL('image/webp', quality)
          last = { url, quality, width: canvas.width, height: canvas.height }
          if (url.length * 0.75 <= max) return last
        }
      }
      return last
    },
    { data: `data:image/png;base64,${png.toString('base64')}`, max: MAX_BYTES }
  )
  await page.close()
  return { ...result, bytes: Buffer.from(result.url.split(',')[1], 'base64') }
}

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
mkdirSync(OUT, { recursive: true })

for (const theme of ['light', 'dark']) {
  for (const [aspect, { viewport, scale }] of Object.entries(ASPECTS)) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: 'no-preference' })
    await context.addInitScript((t) => localStorage.setItem('theme', t), theme)
    const page = await context.newPage()
    await page.goto(BASE + '/', { waitUntil: 'load' })
    await page.waitForSelector('.tt-hero-canvas.is-visible', { timeout: 30000 })
    // The landing press: 200ms crossfade, then 55 frames at 60fps.
    await page.waitForTimeout(2200)
    const end = await page.evaluate(scrollFor, 1)

    // Only the scene: no page, no washes, no floating keys, no float.
    await page.addStyleTag({
      content: `
        * { visibility: hidden !important; }
        .tt-hero-stage, .tt-hero-stage canvas { visibility: visible !important; }
        html, body, #root, .tt-landing { background: transparent !important; }
      `,
    })

    for (const [shot, y] of [['key', 0], ['keyboard', end]]) {
      await page.evaluate((top) => document.getElementById('root').scrollTo(0, top), y)
      await page.waitForTimeout(2500)
      const box = await page.locator('.tt-hero-canvas').boundingBox()
      const png = await page.screenshot({ clip: box, omitBackground: true, animations: 'disabled' })
      const webp = await encodeWebp(browser, png)
      const name = `${shot}-${theme}-${aspect}.webp`
      writeFileSync(join(OUT, name), webp.bytes)
      const kb = (webp.bytes.length / 1024).toFixed(1)
      console.log(`${name}  ${webp.width}×${webp.height}  ${kb} KB  q${webp.quality.toFixed(2)}`)
    }
    await context.close()
  }
}

await browser.close()
