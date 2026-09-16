/**
 * Everything a merge of the race branch touches that is not the race itself.
 *
 *   npm run test:race -- regression
 *
 * The race stylesheet lives in the same index.css as every other page, and
 * one of its class names already collided with the Terms page once. These
 * check that the pages around the race still render and work as intended.
 */
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'

const DESKTOP = { viewport: { width: 1440, height: 900 } }
const PHONE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}

/**
 * Firefox cannot emulate a mobile device and throws on the flag, so it gets the
 * phone viewport and user agent without it. Chromium and WebKit get the lot.
 */
function forEngine(browser: Browser, device: typeof DESKTOP | typeof PHONE) {
  if (browser.browserType().name() !== 'firefox') return device
  const options: Record<string, unknown> = { ...device }
  delete options.isMobile
  return options as typeof device
}

// Every page gets its own context, closed after the test. A page left open
// leaks into the next test's failure screenshots and points at the wrong page.
const contexts: BrowserContext[] = []
test.afterEach(async () => {
  for (const context of contexts.splice(0)) await context.close().catch(() => {})
})

/**
 * index.html loads Microsoft Clarity on every page, localhost included, so a
 * test browser would send its session to TapTest's real Clarity project. And
 * when a test reloads, WebKit reports Clarity's in-flight request as a page
 * error. Tests answer Clarity with an empty script instead.
 */
async function blockAnalytics(context: BrowserContext) {
  await context.route(/^https:\/\/([^/]+\.)?clarity\.ms\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
  )
}

async function open(browser: Browser, route: string, device: typeof DESKTOP | typeof PHONE = DESKTOP) {
  const context = await browser.newContext(forEngine(browser, device))
  contexts.push(context)
  await blockAnalytics(context)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(route)
  return { page, errors }
}

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => {
    const root = document.getElementById('root')
    return (
      document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
      (!root || root.scrollWidth <= root.clientWidth)
    )
  })

/** What shows a route has rendered. The solo setup screen has no heading, so it gets its first control. */
const timerChoice = (page: Page) => page.getByRole('button', { name: /^Select .* timer$/ }).first()
const READY: Record<string, (page: Page) => Locator> = {
  '/#/': (page) => page.locator('h1').first(),
  '/#/start': timerChoice,
  '/#/terms': (page) => page.locator('h1').first(),
  '/#/privacy': (page) => page.locator('h1').first(),
  '/#/about': (page) => page.locator('h1').first(),
}

for (const [route, ready] of Object.entries(READY)) {
  for (const [label, device] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ] as const) {
    test(`${route} renders on ${label} with no errors and no sideways scroll`, async ({ browser }) => {
      const { page, errors } = await open(browser, route, device)
      await expect(ready(page)).toBeVisible()
      expect(await noSidewaysScroll(page)).toBe(true)
      expect(errors).toEqual([])
    })
  }
}

test('Terms keeps its own two equal columns on desktop and one column on a phone', async ({ browser }) => {
  // .tt-split belongs to the Terms page. The race once defined a class of the
  // same name globally and silently re-laid it out.
  const desktop = await open(browser, '/#/terms')
  const split = desktop.page.locator('.tt-split').first()
  await expect(split).toBeVisible()
  const wide = await split.evaluate((el) => {
    const s = getComputedStyle(el)
    return { display: s.display, columns: s.gridTemplateColumns.split(' ').map(parseFloat), gap: s.columnGap }
  })
  expect(wide.display).toBe('grid')
  expect(wide.columns).toHaveLength(2)
  expect(Math.abs(wide.columns[0] - wide.columns[1])).toBeLessThanOrEqual(1)
  expect(wide.gap).toBe('34px')

  const phone = await open(browser, '/#/terms', PHONE)
  const narrow = await phone.page
    .locator('.tt-split')
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el)
      return { display: s.display, columns: s.gridTemplateColumns.split(' ').length, gap: s.rowGap }
    })
  expect(narrow).toEqual({ display: 'grid', columns: 1, gap: '22px' })
})

test('the landing page and the solo setup both lead to the race', async ({ browser }) => {
  const landing = await open(browser, '/#/')
  await landing.page.getByRole('button', { name: /race a friend/i }).click()
  await expect(landing.page).toHaveURL(/#\/race$/)
  await expect(landing.page.getByRole('heading', { name: 'Race someone.' })).toBeVisible()

  const setup = await open(browser, '/#/start')
  await setup.page.getByRole('button', { name: /race a friend/i }).click()
  await expect(setup.page).toHaveURL(/#\/race$/)
  expect([...landing.errors, ...setup.errors]).toEqual([])
})

test('the solo test still starts and marks typing right and wrong', async ({ browser }) => {
  const { page, errors } = await open(browser, '/#/start')

  await timerChoice(page).click()
  await page.getByRole('button', { name: /^Select .* difficulty$/ }).first().click()
  await page.getByRole('button', { name: 'Start typing test' }).click()
  await expect(page).toHaveURL(/#\/test\?/)

  // The real characters carry data-testid="char-N". The typing area also
  // holds a hidden measuring span, so its textContent is not the passage.
  // The passage renders as those spans, a 1.5-second entrance animation swaps
  // them out, and then they come back. WebKit can show char-0 before the swap,
  // so a single read can land in the gap and find no passage at all.
  const readOpening = () =>
    page
      .locator('[data-testid^="char-"]')
      .evaluateAll((spans) =>
        spans
          .slice(0, 8)
          .map((span) => (span.textContent === String.fromCharCode(160) ? ' ' : span.textContent))
          .join('')
      )
  let opening = ''
  await expect.poll(async () => (opening = await readOpening()), { timeout: 15_000 }).toHaveLength(8)

  await page.locator('[data-testid="typing-area"]').click()
  await page.keyboard.type(opening, { delay: 40 })
  await expect(page.locator('.typing-char-correct')).toHaveCount(8)

  await page.keyboard.type('#')
  await expect(page.locator('.typing-char-incorrect')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('leaving the race page closes its connection', async ({ browser }) => {
  // The race socket keeps the server container awake, and that server bills
  // by usage. It must not outlive the race page.
  const { page } = await open(browser, '/#/')
  const sockets: { url: string; closed: boolean }[] = []
  page.on('websocket', (ws) => {
    const entry = { url: ws.url(), closed: false }
    sockets.push(entry)
    ws.on('close', () => {
      entry.closed = true
    })
  })

  await page.goto('/#/race')
  await expect(page.getByRole('button', { name: 'Create a room' })).toBeEnabled()
  await page.goto('/#/start')
  await expect(timerChoice(page)).toBeVisible()

  const race = sockets.filter((s) => s.url.includes('race-socket'))
  expect(race.length).toBeGreaterThan(0)
  await expect.poll(() => race.every((s) => s.closed)).toBe(true)
})
