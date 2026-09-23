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
  '/': (page) => page.locator('h1').first(),
  '/start': timerChoice,
  '/terms': (page) => page.locator('h1').first(),
  '/privacy': (page) => page.locator('h1').first(),
  '/about': (page) => page.locator('h1').first(),
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
  const desktop = await open(browser, '/terms')
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

  const phone = await open(browser, '/terms', PHONE)
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
  const landing = await open(browser, '/')
  // The hero's own link; the race section further down has one too.
  await landing.page.getByRole('link', { name: /race a friend/i }).first().click()
  await expect(landing.page).toHaveURL(/\/race$/)
  await expect(landing.page.getByRole('heading', { name: 'Race someone.' })).toBeVisible()

  const setup = await open(browser, '/start')
  await setup.page.getByRole('link', { name: /race a friend/i }).click()
  await expect(setup.page).toHaveURL(/\/race$/)
  expect([...landing.errors, ...setup.errors]).toEqual([])
})

test('the solo test still starts and marks typing right and wrong', async ({ browser }) => {
  const { page, errors } = await open(browser, '/start')

  await timerChoice(page).click()
  await page.getByRole('button', { name: /^Select .* difficulty$/ }).first().click()
  await page.getByRole('button', { name: 'Start typing test' }).click()
  await expect(page).toHaveURL(/\/test\?/)

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
  const { page } = await open(browser, '/')
  const sockets: { url: string; closed: boolean }[] = []
  page.on('websocket', (ws) => {
    const entry = { url: ws.url(), closed: false }
    sockets.push(entry)
    ws.on('close', () => {
      entry.closed = true
    })
  })

  await page.goto('/race')
  await expect(page.getByRole('button', { name: 'Create a room' })).toBeEnabled()
  await page.goto('/start')
  await expect(timerChoice(page)).toBeVisible()

  const race = sockets.filter((s) => s.url.includes('race-socket'))
  expect(race.length).toBeGreaterThan(0)
  await expect.poll(() => race.every((s) => s.closed)).toBe(true)
})

test('the homepage leads to the race from its hero button and from the race section', async ({ browser }) => {
  const { page, errors } = await open(browser, '/')

  // In the hero, beside the main call to action rather than as a footnote
  // under it.
  const hero = page.locator('section').first()
  await hero.getByRole('link', { name: 'Race a friend' }).click()
  await expect(page).toHaveURL(/\/race$/)

  await page.goto('/')
  const section = page.locator('.tt-lr')
  await expect(section.getByRole('heading', { name: 'Race a friend.' })).toBeVisible()
  await expect(section.locator('.tt-lr-tick')).toHaveText(['Same passage', 'Same timer', 'See them word by word'])
  await section.getByRole('link', { name: 'Race a friend' }).click()
  await expect(page).toHaveURL(/\/race$/)
  expect(errors).toEqual([])
})

test('the race preview runs a real minute, 1:00 down to 0:00, and then starts again', async ({ browser }) => {
  // Playwright's WebKit build on Windows does not let the test clock drive
  // this page's repeating timers, so the minute cannot be walked there. The
  // real-time test below covers WebKit; the logic walked here is the same.
  test.skip(browser.browserType().name() === 'webkit', 'test clock does not drive page timers in WebKit')
  const context = await browser.newContext(forEngine(browser, DESKTOP))
  contexts.push(context)
  await blockAnalytics(context)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  // A controllable clock, so a minute of preview does not cost a minute of test.
  await page.clock.install()
  await page.goto('/')

  const clock = page.locator('.tt-lr-clock')
  const standing = page.locator('.tt-lr-standing')
  await clock.scrollIntoViewIfNeeded()
  await expect(page.locator('.tt-lr-players')).toContainText('Ramesh')
  await expect(page.locator('.tt-lr-players')).toContainText('Suresh')

  // The preview starts the moment it is on screen, and how far it got while
  // the page loaded differs by engine. Stop time, then carry the preview to
  // the start of its next minute, so the walk below begins from a known 1:00.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 200)
  const shown = async () => ((await clock.textContent()) ?? '').slice(0, 4)
  await expect
    .poll(
      async () => {
        await page.clock.runFor(500)
        return shown()
      },
      { intervals: [50], timeout: 60_000 }
    )
    .toBe('1:00')

  await page.clock.runFor(30_000)
  await expect(clock).toHaveText(/^0:30/)
  // Suresh leads early...
  await expect(standing).toHaveText(/Suresh is \d+ words? ahead/)
  const typed = await page.locator('.tt-lr-typed').textContent()
  expect(typed!.length).toBeGreaterThan(40)

  // ...and Ramesh has overtaken him before the end.
  await page.clock.runFor(28_000)
  await expect(clock).toHaveText(/^0:02/)
  await expect(standing).toHaveText(/Ramesh is \d+ words? ahead/)

  await page.clock.runFor(2_500)
  await expect(clock).toHaveText(/^0:00/)
  // A beat on 0:00, then the next race.
  await page.clock.runFor(1_000)
  await expect(clock).toHaveText(/^1:00/)
  expect(errors).toEqual([])
})

test('the race preview counts down in real time, in every engine', async ({ browser }) => {
  const { page, errors } = await open(browser, '/')
  const clock = page.locator('.tt-lr-clock')
  await clock.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)

  const seconds = async () => {
    const [, m, s] = ((await clock.textContent()) ?? '').match(/^(\d):(\d\d)/) ?? []
    return Number(m) * 60 + Number(s)
  }
  // The line shows only the last stretch typed, so compare the text, not its length.
  const typed = async () => (await page.locator('.tt-lr-typed').textContent()) ?? ''

  // Under a full parallel run a single read can take seconds in WebKit, so
  // the clock is judged against the time that really passed between reads.
  const start = Date.now()
  const before = { left: await seconds(), typed: await typed() }
  const startRead = Date.now()
  await page.waitForTimeout(3200)
  const endRead = Date.now()
  const after = { left: await seconds(), typed: await typed() }
  const end = Date.now()

  const dropped = before.left - after.left
  expect(dropped).toBeGreaterThanOrEqual(Math.floor((endRead - startRead) / 1000) - 1)
  expect(dropped).toBeLessThanOrEqual(Math.ceil((end - start) / 1000) + 1)
  expect(after.typed).not.toBe(before.typed)
  expect(errors).toEqual([])
})

test('with reduced motion the race preview holds a single still frame', async ({ browser }) => {
  const context = await browser.newContext({ ...forEngine(browser, DESKTOP), reducedMotion: 'reduce' })
  contexts.push(context)
  await blockAnalytics(context)
  const page = await context.newPage()
  await page.goto('/')

  const clock = page.locator('.tt-lr-clock')
  await clock.scrollIntoViewIfNeeded()
  const first = await clock.textContent()
  expect(first).toMatch(/^0:12/)
  await page.waitForTimeout(1500)
  expect(await clock.textContent()).toBe(first)
})

test('the homepage loads no Google sign-in script and no full-size logo', async ({ browser }) => {
  // Two 1.5 MB logos and Google's 100 KB sign-in script used to ride along on
  // every first visit; on a phone over slow 4G they kept the page loading for
  // about 18 seconds.
  const context = await browser.newContext(forEngine(browser, PHONE))
  contexts.push(context)
  await blockAnalytics(context)
  const page = await context.newPage()
  const urls: string[] = []
  page.on('request', (request) => urls.push(request.url()))

  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible()
  await page.waitForLoadState('load')
  await page.waitForTimeout(1000)

  expect(urls.filter((url) => url.includes('accounts.google.com'))).toEqual([])
  expect(urls.filter((url) => /\/logo(un)?press\.png/.test(url))).toEqual([])
  expect(urls.some((url) => url.includes('/assets/logounpress-192.webp'))).toBe(true)
})

for (const route of ['/login', '/register']) {
  test(`${route} still loads Google sign-in`, async ({ browser }) => {
    const context = await browser.newContext(forEngine(browser, DESKTOP))
    contexts.push(context)
    await blockAnalytics(context)
    // Answered here, so the test proves the page asks for the script without
    // depending on Google's servers.
    await context.route(/accounts\.google\.com\/gsi\/client/, (r) =>
      r.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
    )
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    const signIn = page.waitForRequest((request) => request.url().includes('accounts.google.com/gsi/client'), {
      timeout: 20_000,
    })
    await page.goto(route)
    await signIn
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15_000 })
    expect(errors).toEqual([])
  })
}

/**
 * AuthLayout keeps both layouts in the DOM at once — `hidden md:flex` for the
 * desktop split screen, `md:hidden` for the phone — so every id inside the
 * form exists twice. The checkbox drove itself with getElementById, which
 * returns the first match: at phone width that is the copy inside the hidden
 * desktop branch, so tapping the visible box toggled an input nobody could
 * see and nobody could sign up. Phone first, because that is where it broke.
 */
for (const device of [PHONE, DESKTOP]) {
  const where = device === PHONE ? 'a phone' : 'a desktop'

  test(`Remember me can be ticked on ${where}`, async ({ browser }) => {
    const { page, errors } = await open(browser, '/login', device)

    const box = page.locator('input[type="checkbox"]:visible').first()
    await expect(box).toHaveCount(1)
    await expect(box).not.toBeChecked()

    // The square, which is a sibling div driving the visually hidden input.
    await box.locator('xpath=following-sibling::div[1]').click()
    await expect(box).toBeChecked()

    // And the text, through the native label association. Scoped to the
    // visible one: both layouts are in the DOM, so there are two labels.
    await page.locator('label:visible', { hasText: 'Remember me' }).click()
    await expect(box).not.toBeChecked()

    expect(errors).toEqual([])
  })

  test(`the terms box can be ticked on ${where}`, async ({ browser }) => {
    const { page, errors } = await open(browser, '/register', device)

    const box = page.locator('input[type="checkbox"]:visible').first()
    await expect(box).toHaveCount(1)
    await expect(box).not.toBeChecked()

    await box.locator('xpath=following-sibling::div[1]').click()
    await expect(box).toBeChecked()

    expect(errors).toEqual([])
  })
}

/** The duplicate ids are what broke the checkbox; none should be left on it. */
test('no id inside the auth forms is duplicated by the two layouts', async ({ browser }) => {
  for (const route of ['/login', '/register']) {
    const { page } = await open(browser, route, PHONE)
    // open() resolves on load, but the form is a lazy chunk. Without this the
    // evaluate below runs against an empty #root, finds no ids at all, and
    // passes whatever the component does — which is how this test first went
    // green against the very bug it exists to catch.
    await expect(page.locator('input[type="checkbox"]:visible')).toHaveCount(1)

    const duplicated = await page.evaluate(() => {
      const seen: Record<string, number> = {}
      document.querySelectorAll('[id]').forEach((el) => {
        seen[el.id] = (seen[el.id] ?? 0) + 1
      })
      return Object.entries(seen)
        .filter(([, count]) => count > 1)
        .map(([id]) => id)
    })
    // username and password are still duplicated — a known, separate issue
    // tracked in DEVELOPMENT_LOG. The checkbox ids must not come back.
    expect(duplicated, `${route} has duplicate checkbox ids`).not.toContain('remember-me')
    expect(duplicated, `${route} has duplicate checkbox ids`).not.toContain('accept-terms')
  }
})

/**
 * The closing call to action on About and Contact became a link in September
 * 2026. `.tt-doc a` sets the green link colour with one notch more specificity
 * than the bare `.tt-closer-cta` class, so it won and painted the label
 * --primary-deep on a --primary button: green on green, unreadable.
 *
 * Asserted against the token rather than a literal colour, so this still means
 * "the label uses the button's own foreground" if the theme is ever retuned.
 */
for (const route of ['/about', '/contact']) {
  test(`the closing call to action on ${route} is readable`, async ({ browser }) => {
    const { page, errors } = await open(browser, route)

    const cta = page.locator('.tt-closer-cta')
    await expect(cta).toBeVisible()

    const seen = await cta.evaluate((el) => {
      const root = getComputedStyle(document.documentElement)
      const cs = getComputedStyle(el)
      return {
        colour: cs.color,
        background: cs.backgroundColor,
        foregroundToken: root.getPropertyValue('--primary-foreground').trim(),
      }
    })

    expect(seen.colour, 'label should use the button foreground').toBe(seen.foregroundToken)
    expect(seen.colour, 'label is the same colour as the button').not.toBe(seen.background)
    expect(errors).toEqual([])
  })
}
