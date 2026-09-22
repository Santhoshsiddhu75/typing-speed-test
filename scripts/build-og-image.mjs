/**
 * Renders public/assets/og-image.png, the 1200x630 card Google, WhatsApp,
 * Slack, X and the rest show when someone shares a TapTest link.
 *
 * Run by hand — `node scripts/build-og-image.mjs` — not during `npm run
 * build`, because it needs a browser and Vercel's build image has none. The
 * output is committed. Re-run it if the logo or the wording changes.
 *
 * A screenshot rather than a drawn PNG so the card uses the site's real
 * typeface and the real logo file, and cannot drift from the brand.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'public/assets/og-image.png')

// Inlined, not a file:// src. setContent leaves the page on about:blank, and
// a page with no origin is not allowed to load a local file, so the logo came
// out as a broken-image box.
const logo = `data:image/png;base64,${readFileSync(
  resolve(root, 'public/assets/logounpress.png')
).toString('base64')}`

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Autour+One&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; margin: 0; }
      body {
        width: 1200px; height: 630px; overflow: hidden;
        background: rgb(15, 23, 42);
        color: rgb(226, 232, 240);
        font-family: 'Autour One', system-ui, sans-serif;
        position: relative;
        display: flex; flex-direction: column;
        justify-content: center;
        padding: 0 88px;
      }
      /* The same green wash the site carries behind its hero. */
      .wash {
        position: absolute; border-radius: 50%; pointer-events: none;
      }
      .wash.a {
        width: 900px; height: 900px; left: -260px; top: -320px;
        background: radial-gradient(circle, rgba(34,197,94,.20) 0%, rgba(34,197,94,.06) 45%, transparent 70%);
      }
      .wash.b {
        width: 760px; height: 760px; right: -220px; bottom: -300px;
        background: radial-gradient(circle, rgba(34,197,94,.16) 0%, rgba(34,197,94,.05) 45%, transparent 70%);
      }
      .brand { position: relative; display: flex; align-items: center; gap: 22px; }
      .brand img { width: 84px; height: 84px; }
      .brand span { font-size: 62px; letter-spacing: .01em; color: #fff; }
      h1 {
        position: relative;
        margin-top: 36px;
        font-size: 76px; font-weight: 400; line-height: 1.04;
        letter-spacing: -.035em; color: #fff;
        max-width: 17ch;
      }
      .rule {
        position: relative;
        width: 92px; height: 3px; margin-top: 34px;
        background: rgb(34, 197, 94);
      }
      .foot {
        position: relative;
        margin-top: 30px;
        font-family: 'Fira Code', monospace;
        font-size: 21px; letter-spacing: .02em;
        color: rgb(148, 163, 184);
      }
      .foot b { color: rgb(34, 197, 94); font-weight: 500; }
    </style>
  </head>
  <body>
    <div class="wash a"></div>
    <div class="wash b"></div>

    <div class="brand">
      <img src="${logo}" alt="" />
      <span>TapTest</span>
    </div>

    <h1>How fast do you actually type?</h1>
    <div class="rule"></div>

    <div class="foot">
      Typing speed test &nbsp;&middot;&nbsp; <b>WPM</b> and <b>accuracy</b> on real prose
      &nbsp;&middot;&nbsp; www.taptest.in
    </div>
  </body>
</html>`

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})
await page.setContent(html, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
mkdirSync(dirname(out), { recursive: true })
await page.screenshot({ path: out, type: 'png' })
await browser.close()

console.log(`og-image.png written to ${out}`)
