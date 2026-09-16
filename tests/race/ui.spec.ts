/**
 * The race as players meet it: two real browsers, the real client and the
 * real server. Every phase from both sides, desktop and phone, and the ways a
 * connection goes wrong on a phone.
 *
 *   npm run test:race -- ui
 *
 * Each player's race traffic is routed through the test, so a test can cut a
 * player's connection and restore it — the closest thing to a phone losing
 * signal or suspending the page.
 */
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type WebSocketRoute,
} from '@playwright/test'

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

interface Player {
  page: Page
  context: BrowserContext
  /** Uncaught exceptions on the page. Any at all is a failure. */
  errors: string[]
  /** How many connections to the race server the page has opened. */
  connections: () => number
  /** Cut this player off from the race server and keep them off. */
  goOffline: () => Promise<void>
  /**
   * Silence their connection without closing it — a phone that switched
   * networks or sat suspended, still holding a socket that goes nowhere.
   */
  goQuiet: () => void
  /** Let them reconnect; socket.io retries on its own. */
  goOnline: () => void
}

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

async function openPlayer(
  browser: Browser,
  {
    device = DESKTOP,
    unreachable = false,
  }: { device?: typeof DESKTOP | typeof PHONE; unreachable?: boolean } = {}
): Promise<Player> {
  // Clipboard permissions exist only in Chromium; the other engines reject the names outright.
  const isChromium = browser.browserType().name() === 'chromium'
  const context = await browser.newContext({
    ...forEngine(browser, device),
    ...(isChromium ? { permissions: ['clipboard-read', 'clipboard-write'] } : {}),
  })
  contexts.push(context)
  await blockAnalytics(context)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  let blocked = false
  let made = 0
  // Live connections to the race server, each with a switch that silences it
  // without closing it.
  const open: { ws: WebSocketRoute; quiet: boolean }[] = []
  await page.routeWebSocket(/race-socket/, (ws) => {
    // An unreachable server: the connection is never answered, which is how a
    // dead host or a stalled proxy looks from the browser.
    if (unreachable) return
    if (blocked) {
      void ws.close()
      return
    }
    const server = ws.connectToServer()
    const link = { ws, quiet: false }
    ws.onMessage((message) => {
      if (!link.quiet) server.send(message)
    })
    server.onMessage((message) => {
      if (!link.quiet) ws.send(message)
    })
    made += 1
    open.push(link)
  })
  await page.route('**/race-socket/**', (route) =>
    blocked || unreachable ? route.abort() : route.continue()
  )

  await page.goto('/#/race')
  if (!unreachable) await expect(page.getByRole('button', { name: 'Create a room' })).toBeEnabled()

  return {
    page,
    context,
    errors,
    connections: () => made,
    goOffline: async () => {
      blocked = true
      for (const link of open.splice(0)) await link.ws.close()
    },
    goQuiet: () => {
      for (const link of open) link.quiet = true
    },
    goOnline: () => {
      blocked = false
    },
  }
}

function expectNoErrors(...players: Player[]) {
  for (const player of players) expect(player.errors, 'uncaught page errors').toEqual([])
}

async function createRoom(
  player: Player,
  name: string,
  { length, level }: { length?: '1 min' | '2 min' | '5 min'; level?: 'easy' | 'medium' | 'hard' } = {}
): Promise<string> {
  await player.page.getByLabel('Your name').fill(name)
  if (length) await player.page.getByRole('button', { name: length, exact: true }).click()
  if (level) await player.page.getByRole('button', { name: level, exact: true }).click()
  await player.page.getByRole('button', { name: 'Create a room' }).click()
  const keys = player.page.locator('.tt-code-key')
  await expect(keys).toHaveCount(6)
  return (await keys.allTextContents()).join('')
}

/** Enter the code, then give a name on the step that follows it. */
async function joinRoom(player: Player, name: string, code: string) {
  await player.page.getByLabel('Room code').fill(code)
  await player.page.getByRole('button', { name: 'Join', exact: true }).click()
  await expect(player.page.getByRole('heading', { name: /is waiting\.$/ })).toBeVisible()
  await player.page.getByLabel('Your name').fill(name)
  await player.page.getByRole('button', { name: 'Join the race' }).click()
}

const gate = (player: Player) => player.page.getByRole('heading', { name: 'Both ready?' })
const readyButton = (player: Player) => player.page.getByRole('button', { name: 'Ready', exact: true })
const seatState = (player: Player, name: string) =>
  player.page.locator('.tt-seat', { hasText: name }).locator('.tt-state')

/** Two players seated at the ready gate. */
async function atGate(
  browser: Browser,
  options: { hostName?: string; guestName?: string; device?: typeof DESKTOP | typeof PHONE } = {}
) {
  const host = await openPlayer(browser, { device: options.device })
  const guest = await openPlayer(browser, { device: options.device })
  const code = await createRoom(host, options.hostName ?? 'Ada')
  await joinRoom(guest, options.guestName ?? 'Grace', code)
  await expect(gate(host)).toBeVisible()
  await expect(gate(guest)).toBeVisible()
  return { host, guest, code }
}

/** Two players with the race running and the passage on both screens. */
async function racing(browser: Browser, options: Parameters<typeof atGate>[1] = {}) {
  const seated = await atGate(browser, options)
  await readyButton(seated.host).click()
  await readyButton(seated.guest).click()
  await expect(seated.host.page.locator('.tt-race-text')).toBeVisible({ timeout: 10_000 })
  await expect(seated.guest.page.locator('.tt-race-text')).toBeVisible({ timeout: 10_000 })
  return seated
}

/**
 * Put exactly `count` characters of the passage into the player's input, the
 * way a stream of keystrokes would. Driving the input directly keeps the test
 * about the race rather than about how fast the test runner can press keys.
 */
async function typeUpTo(player: Player, count: number, { mistake = false } = {}) {
  await player.page.evaluate(
    ({ count, mistake }) => {
      const input = document.querySelector<HTMLInputElement>('.tt-capture-race')!
      const text = document.querySelector('.typing-text')!.textContent!
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, text.slice(0, Math.min(count, text.length)) + (mistake ? '#' : ''))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
    { count, mistake }
  )
}

const passage = (player: Player) => player.page.locator('.typing-text').textContent()
const standing = (player: Player) => player.page.locator('.tt-standing span')

function wordsBetween(text: string, from: number, to: number) {
  const slice = text.slice(from, to).trim()
  return slice ? slice.split(/\s+/).length : 0
}

async function finishBoth(host: Player, guest: Player) {
  await typeUpTo(host, 1e9)
  await typeUpTo(guest, 1e9)
  await expect(host.page.locator('.tt-verdict.is-in')).toBeVisible({ timeout: 15_000 })
  await expect(guest.page.locator('.tt-verdict.is-in')).toBeVisible({ timeout: 15_000 })
}

const score = async (player: Player, side: 'you' | 'them') =>
  Number(await player.page.locator(`.tt-stand-${side} .tt-score-big`).textContent())

// ---------------------------------------------------------------------------

test.describe('setup', () => {
  test('shows the three claims, caps names at 8, and presses one setting key at a time', async ({ browser }) => {
    const player = await openPlayer(browser)
    const { page } = player

    await expect(page.locator('.tt-tick')).toHaveText(['Same passage', 'Same timer', 'See them word by word'])

    await page.getByLabel('Your name').fill('Bartholomew')
    await expect(page.getByLabel('Your name')).toHaveValue('Bartholo')
    await expect(page.locator('.tt-showcase .tt-namekey')).toHaveText('Bartholo')

    const two = page.getByRole('button', { name: '2 min', exact: true })
    await two.click()
    await expect(two).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: '1 min', exact: true })).toHaveAttribute('aria-pressed', 'false')

    const hard = page.getByRole('button', { name: 'hard', exact: true })
    await hard.click()
    await expect(hard).toHaveAttribute('aria-pressed', 'true')
    await expect(hard).toHaveClass(/is-hard/)
    await expect(page.getByRole('button', { name: 'medium', exact: true })).toHaveAttribute('aria-pressed', 'false')

    expectNoErrors(player)
  })

  test('a room cannot be created without a name', async ({ browser }) => {
    const player = await openPlayer(browser)
    const { page } = player
    const field = page.getByLabel('Your name')
    const note = page.getByText('Add your name to create a room.')

    await field.fill('   ')
    await page.getByRole('button', { name: 'Create a room' }).click()
    await expect(note).toBeVisible()
    await expect(field).toBeFocused()
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('.tt-code-key')).toHaveCount(0)

    await field.fill('Ada')
    await expect(note).toHaveCount(0)
    await page.getByRole('button', { name: 'Create a room' }).click()
    await expect(page.getByRole('heading', { name: 'Send this code.' })).toBeVisible()
    expectNoErrors(player)
  })

  test('a plate slides under the chosen length and level, and the chosen text stays neutral', async ({ browser }) => {
    const player = await openPlayer(browser)
    const { page } = player
    const foreground = await page.locator('.tt-race').evaluate((el) => getComputedStyle(el).color)
    const colorOf = (name: string) =>
      page.getByRole('button', { name, exact: true }).evaluate((el) => getComputedStyle(el).color)

    for (const [row, choice, other] of [
      [0, '2 min', '1 min'],
      [1, 'hard', 'easy'],
    ] as const) {
      const key = page.getByRole('button', { name: choice, exact: true })
      await key.click()
      // The plate comes to rest under the key that was pressed.
      const plate = page.locator('.tt-keyrow').nth(row).locator('.tt-keyplate')
      await expect
        .poll(async () => Math.abs((await plate.boundingBox())!.x - (await key.boundingBox())!.x))
        .toBeLessThan(2)
      // Neutral text, not the level colour, and no sinking press.
      expect(await colorOf(choice)).toBe(foreground)
      expect(await colorOf(other)).not.toBe(foreground)
      expect(await key.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
    }
    expectNoErrors(player)
  })

  test('Join waits for six digits, and the code field accepts digits only', async ({ browser }) => {
    const { page, ...rest } = await openPlayer(browser)
    const join = page.getByRole('button', { name: 'Join', exact: true })
    const field = page.getByLabel('Room code')

    await expect(join).toBeDisabled()
    await field.fill('12a3-45')
    await expect(field).toHaveValue('12345')
    await expect(join).toBeDisabled()
    await field.fill('1234567')
    await expect(field).toHaveValue('123456')
    await expect(join).toBeEnabled()
    expectNoErrors({ page, ...rest })
  })

  test('without the race server, Create is disabled and the page says why', async ({ browser }) => {
    test.setTimeout(60_000)
    const player = await openPlayer(browser, { unreachable: true })
    await expect(player.page.getByText('Waking the race server')).toBeVisible()
    await expect(player.page.getByRole('button', { name: 'Create a room' })).toBeDisabled()
    // socket.io gives up on an unanswered connection after 20 seconds.
    await expect(player.page.getByText('Could not reach the race server')).toBeVisible({ timeout: 30_000 })
    expectNoErrors(player)
  })

  test('the header uses the real logo, back to the landing page, and Solo test goes to /start', async ({ browser }) => {
    const player = await openPlayer(browser)
    const { page } = player

    const logo = page.locator('.tt-race-bar a[href="#/"]')
    await expect(logo).toBeVisible()
    await expect(logo.locator('img').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solo test' }).click()
    await expect(page).toHaveURL(/#\/start$/)

    await page.goto('/#/race')
    await page.locator('.tt-race-bar a[href="#/"]').click()
    await expect(page).toHaveURL(/#\/$/)
    expectNoErrors(player)
  })
})

test.describe('the lobby', () => {
  test('shows the code on six keys, copies it, and Leave returns to setup', async ({ browser }) => {
    const player = await openPlayer(browser)
    const { page } = player
    const code = await createRoom(player, 'Ada')
    expect(code).toMatch(/^\d{6}$/)

    await expect(page.getByRole('heading', { name: 'Send this code.' })).toBeVisible()
    await expect(page.locator('.tt-seat').first()).toContainText('Ada')
    await expect(page.locator('.tt-seat').first()).toContainText('HERE')

    // Reading the clipboard back needs a permission only Chromium can grant a test.
    if (browser.browserType().name() === 'chromium') {
      await page.getByRole('button', { name: 'Copy code' }).click()
      await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code)
    }

    await page.getByRole('button', { name: 'Leave' }).click()
    await expect(page.getByRole('heading', { name: 'Race someone.' })).toBeVisible()
    expectNoErrors(player)
  })

  test('Back in the lobby returns to setup and closes the room behind it', async ({ browser }) => {
    const host = await openPlayer(browser)
    const code = await createRoom(host, 'Ada')

    const back = host.page.locator('.tt-stage').getByRole('button', { name: 'Back', exact: true })
    await expect(back).toBeVisible()
    await back.click()
    await expect(host.page.getByRole('heading', { name: 'Race someone.' })).toBeVisible()

    // Nobody is left in the room, so the code no longer leads anywhere.
    const friend = await openPlayer(browser)
    await friend.page.getByLabel('Room code').fill(code)
    await friend.page.getByRole('button', { name: 'Join', exact: true }).click()
    await expect(friend.page.getByText('No race with that code')).toBeVisible()
    expectNoErrors(host, friend)
  })

  test('a wrong code and a full room each say what went wrong', async ({ browser }) => {
    const { host, guest, code } = await atGate(browser)
    const third = await openPlayer(browser)

    // Both are caught when the code is checked, before anyone is asked for a name.
    await third.page.getByLabel('Room code').fill('000004')
    await third.page.getByRole('button', { name: 'Join', exact: true }).click()
    await expect(third.page.getByText('No race with that code')).toBeVisible()
    await expect(third.page.getByRole('button', { name: 'Join the race' })).toHaveCount(0)

    await third.page.getByLabel('Room code').fill(code)
    await third.page.getByRole('button', { name: 'Join', exact: true }).click()
    await expect(third.page.getByText('That race already has two players.')).toBeVisible()
    await expect(third.page.getByRole('button', { name: 'Join the race' })).toHaveCount(0)
    expectNoErrors(host, guest, third)
  })
})

test.describe('joining by code', () => {
  test('the code is checked first, then the joiner sees who is waiting and must give a name', async ({ browser }) => {
    const host = await openPlayer(browser)
    const guest = await openPlayer(browser)
    const code = await createRoom(host, 'Ada', { length: '2 min', level: 'hard' })
    const { page } = guest

    await page.getByLabel('Room code').fill(code)
    await page.getByRole('button', { name: 'Join', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Ada is waiting.' })).toBeVisible()
    await expect(page.locator('.tt-race-eyebrow')).toHaveText(`Room ${code} · 2 min · hard`)
    // Checking the code took no seat.
    await expect(host.page.getByRole('heading', { name: 'Send this code.' })).toBeVisible()

    const name = page.getByLabel('Your name')
    const go = page.getByRole('button', { name: 'Join the race' })
    await expect(name).toBeFocused()
    await expect(go).toBeDisabled()
    await name.fill('   ')
    await expect(go).toBeDisabled()

    // Back keeps the code, and Join brings the name step round again.
    await page.locator('.tt-stage').getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByLabel('Room code')).toHaveValue(code)
    // Enter in the code field does what Join does.
    await page.getByLabel('Room code').press('Enter')

    await name.fill('Grace')
    await expect(page.locator('.tt-invite-keys .tt-namekey')).toHaveText(['Ada', 'Grace'])
    await name.press('Enter')

    await expect(gate(guest)).toBeVisible()
    await expect(seatState(host, 'Grace')).toHaveText('NOT READY')
    expectNoErrors(host, guest)
  })
})

test.describe('the ready gate', () => {
  test('joining starts nothing, one ready starts nothing, and both ready counts down into the same passage', async ({ browser }) => {
    const { host, guest } = await atGate(browser)

    await expect(seatState(host, 'Grace')).toHaveText('NOT READY')
    await host.page.waitForTimeout(1500)
    await expect(host.page.locator('.tt-countdown-number')).toHaveCount(0)

    await readyButton(host).click()
    await expect(host.page.getByRole('button', { name: 'Cancel ready' })).toBeVisible()
    await expect(seatState(guest, 'Ada')).toHaveText('READY')
    await expect(guest.page.getByText('The countdown starts when you are both ready.')).toBeVisible()
    await guest.page.waitForTimeout(1200)
    await expect(guest.page.locator('.tt-countdown-number')).toHaveCount(0)

    await host.page.getByRole('button', { name: 'Cancel ready' }).click()
    await expect(seatState(guest, 'Ada')).toHaveText('NOT READY')

    await readyButton(host).click()
    await readyButton(guest).click()
    await expect(host.page.locator('.tt-countdown-number')).toBeVisible()
    await expect(guest.page.locator('.tt-countdown-number')).toBeVisible()

    await expect(host.page.locator('.tt-race-text')).toBeVisible({ timeout: 10_000 })
    await expect(guest.page.locator('.tt-race-text')).toBeVisible({ timeout: 10_000 })
    expect(await passage(host)).toBe(await passage(guest))
    expectNoErrors(host, guest)
  })

  test('the length and level the host chose reach the guest and the race clock', async ({ browser }) => {
    const host = await openPlayer(browser)
    const guest = await openPlayer(browser)
    const code = await createRoom(host, 'Ada', { length: '5 min', level: 'hard' })
    await joinRoom(guest, 'Grace', code)

    await expect(guest.page.locator('.tt-race-eyebrow')).toContainText('5 min')
    await expect(guest.page.locator('.tt-race-eyebrow')).toContainText('hard')

    await readyButton(host).click()
    await readyButton(guest).click()
    await expect(guest.page.locator('.tt-race-clock')).toHaveText(/^[45]:\d\d/, { timeout: 10_000 })
    expectNoErrors(host, guest)
  })

  test('Leave sits beside Ready and takes the player back to setup', async ({ browser }) => {
    const { host, guest } = await atGate(browser)
    const actions = guest.page.locator('.tt-result-actions')
    await expect(actions.getByRole('button')).toHaveText(['Ready', 'Leave'])

    await actions.getByRole('button', { name: 'Leave' }).click()
    await expect(guest.page.getByRole('heading', { name: 'Race someone.' })).toBeVisible()
    // The host is left waiting for someone new.
    await expect(host.page.getByRole('heading', { name: 'Send this code.' })).toBeVisible()
    expectNoErrors(host, guest)
  })

  test('two players with the same name are told apart as P1 and P2', async ({ browser }) => {
    const { host, guest } = await atGate(browser, { hostName: 'Sam', guestName: 'Sam' })
    for (const player of [host, guest]) {
      await expect(player.page.locator('.tt-namekey em')).toHaveText(['P1', 'P2'])
    }
    expectNoErrors(host, guest)
  })
})

test.describe('racing', () => {
  test('starts neck and neck, then each side sees the lead from where they stand', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await expect(standing(host)).toHaveText('Neck and neck')
    await expect(standing(guest)).toHaveText('Neck and neck')

    const text = (await passage(host))!
    await typeUpTo(host, 400)
    await typeUpTo(guest, 200)
    const words = wordsBetween(text, 200, 400)

    await expect(standing(guest)).toHaveText(`Ada is ${words} words ahead`)
    await expect(standing(host)).toHaveText(`You are ${words} words ahead`)

    // The trailing player sees the leader marked in the passage, and the
    // words between them underlined as the leader's.
    await expect(guest.page.locator('.tt-opp-here')).toHaveCount(1)
    // An arrow over their letter, not a second caret: a bar that differed from
    // yours only in colour read as another cursor.
    const arrow = await guest.page
      .locator('.tt-opp-here')
      .evaluate((el) => {
        const s = getComputedStyle(el, '::before')
        return { clip: s.clipPath, top: parseFloat(s.top) }
      })
    expect(arrow.clip).toContain('polygon')
    expect(arrow.top).toBeLessThan(0)
    await expect(guest.page.locator('.tt-in-gap.is-theirs')).toHaveCount(200)
    // The leader sees the same stretch as their own.
    await expect(host.page.locator('.tt-in-gap.is-yours')).toHaveCount(200)
    expectNoErrors(host, guest)
  })

  test('a pause does not leave the opponent looking at an old position', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    const text = (await passage(host))!

    await typeUpTo(host, 300)
    await expect(standing(guest)).toHaveText(`Ada is ${wordsBetween(text, 0, 300)} words ahead`)

    // Carry on typing inside the send interval, then stop.
    await typeUpTo(host, 420)
    await expect(standing(guest)).toHaveText(`Ada is ${wordsBetween(text, 0, 420)} words ahead`, {
      timeout: 3000,
    })
    expectNoErrors(host, guest)
  })

  test('typed characters are marked right and wrong', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await typeUpTo(host, 12, { mistake: true })
    await expect(host.page.locator('.tt-race-text .typing-char-correct')).toHaveCount(12)
    await expect(host.page.locator('.tt-race-text .typing-char-incorrect')).toHaveCount(1)
    await expect(host.page.locator('.tt-race-text .typing-char-current')).toHaveCount(1)
    expectNoErrors(host, guest)
  })
})

test.describe('the line', () => {
  for (const [label, device] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ] as const) {
    test(`on a ${label} the passage is one line, and the caret stays in the middle however far you type`, async ({ browser }) => {
      const { host, guest } = await racing(browser, { device })
      const { page } = host

      // One line: every character sits at the same height, and the line runs
      // far wider than the screen.
      const tops = await page
        .locator('.tt-race-text .typing-char')
        .evaluateAll((spans) => [...new Set(spans.slice(0, 400).map((s) => Math.round(s.getBoundingClientRect().top)))])
      expect(tops).toHaveLength(1)
      expect((await page.locator('.tt-race-text .typing-text').boundingBox())!.width).toBeGreaterThan(
        page.viewportSize()!.width
      )

      // A phone forces the passage font to 16px, and any gap between the size
      // the line is laid out at and the size it is positioned by grows with
      // every character — so check well into the passage, not just the start.
      const text = (await passage(host))!
      const view = (await page.locator('.tt-lane-window').boundingBox())!
      for (const reach of [150, 600, Math.min(1000, text.length - 5)]) {
        await typeUpTo(host, reach)
        await expect
          .poll(async () => {
            const caret = (await page.locator('.tt-race-text .typing-char-current').boundingBox())!
            return Math.abs(caret.x + caret.width / 2 - (view.x + view.width / 2))
          })
          .toBeLessThan(12)
      }
      expectNoErrors(host, guest)
    })
  }

  // Rough keyboard heights with the suggestion bar: an iPhone 12 to 15, and an iPhone SE.
  for (const [width, height, keyboard] of [
    [390, 844, 336],
    [375, 667, 260],
  ] as const) {
    test(`on a ${width}x${height} phone the race sits lower than the header yet above the keyboard`, async ({ browser }) => {
      const { host, guest } = await racing(browser, { device: { ...PHONE, viewport: { width, height } } })
      const { page } = host
      const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!

      const header = await box('.tt-race-bar')
      const clock = await box('.tt-race-clock')
      const line = await box('.tt-race-text')
      const lead = await box('.tt-standing')
      const players = await box('.tt-players')
      expect(clock.y).toBeLessThan(line.y)
      expect(line.y).toBeLessThan(lead.y)
      expect(lead.y).toBeLessThan(players.y)
      await expect(page.locator('.tt-players .tt-side-you')).toContainText('Ada')
      await expect(page.locator('.tt-players .tt-side-them')).toContainText('Grace')

      // Brought down from the header on a tall phone rather than pinned under it,
      if (height >= 800) expect(clock.y - (header.y + header.height)).toBeGreaterThan(40)
      // but never so far that the keyboard would cover the players.
      expect(players.y + players.height).toBeLessThan(height - keyboard)
      expectNoErrors(host, guest)
    })
  }

  test('an opponent past either end of the line shows as their name at that edge', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await typeUpTo(host, 400)
    await expect(guest.page.locator('.tt-edge.is-right')).toHaveText('ADA ›')
    await expect(host.page.locator('.tt-edge.is-left')).toHaveText('‹ GRACE')

    // Within reach of each other, the arrow is on the line and the tags go.
    await typeUpTo(guest, 396)
    await expect(guest.page.locator('.tt-edge')).toHaveCount(0)
    await expect(host.page.locator('.tt-edge')).toHaveCount(0)
    expectNoErrors(host, guest)
  })

  test('on a phone the arrow alone marks the lead; wider screens keep the tinted letters', async ({ browser }) => {
    const band = (player: Player) =>
      player.page.locator('.tt-in-gap').first().evaluate((el) => {
        const s = getComputedStyle(el)
        return { background: s.backgroundColor, underline: s.textDecorationLine }
      })

    const phone = await racing(browser, { device: PHONE })
    await typeUpTo(phone.host, 60)
    await expect(phone.guest.page.locator('.tt-in-gap')).toHaveCount(60)
    await expect(phone.guest.page.locator('.tt-opp-here')).toHaveCount(1)
    expect(await band(phone.guest)).toEqual({ background: 'rgba(0, 0, 0, 0)', underline: 'none' })

    const desk = await racing(browser)
    await typeUpTo(desk.host, 60)
    await expect(desk.guest.page.locator('.tt-in-gap')).toHaveCount(60)
    const wide = await band(desk.guest)
    expect(wide.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(wide.underline).toBe('underline')
    expectNoErrors(phone.host, phone.guest, desk.host, desk.guest)
  })
})

test.describe('the result', () => {
  test('verdict, pressed key and margin agree with the scores, on both screens', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await typeUpTo(host, 300)
    await host.page.waitForTimeout(1500)
    await finishBoth(host, guest)

    const hostMine = await score(host, 'you')
    const hostTheirs = await score(host, 'them')
    expect(await score(guest, 'you')).toBe(hostTheirs)
    expect(await score(guest, 'them')).toBe(hostMine)

    if (hostMine === hostTheirs) {
      await expect(host.page.locator('.tt-verdict')).toHaveText('A dead heat.')
      await expect(host.page.locator('.tt-namekey.is-won')).toHaveCount(0)
    } else {
      const hostWon = hostMine > hostTheirs
      await expect(host.page.locator('.tt-verdict')).toHaveText(hostWon ? 'You win.' : 'You lost this one.')
      await expect(guest.page.locator('.tt-verdict')).toHaveText(hostWon ? 'You lost this one.' : 'You win.')
      for (const player of [host, guest]) {
        await expect(player.page.locator('.tt-namekey.is-won')).toHaveText(hostWon ? 'Ada' : 'Grace')
      }
      await expect(host.page.locator('.tt-margin')).toHaveText(
        `${hostWon ? 'Ahead' : 'Behind'} by ${Math.abs(hostMine - hostTheirs)} words per minute`
      )
    }
    expectNoErrors(host, guest)
  })

  test('the clock ends the race without anyone finishing the passage', async ({ browser }) => {
    test.setTimeout(120_000)
    const { host, guest } = await racing(browser)
    await typeUpTo(host, 180)
    await typeUpTo(guest, 90)
    await expect(host.page.locator('.tt-verdict.is-in')).toBeVisible({ timeout: 80_000 })
    await expect(guest.page.locator('.tt-verdict.is-in')).toBeVisible({ timeout: 10_000 })
    expectNoErrors(host, guest)
  })

  test('Rematch takes only the player who pressed it to the lobby; the other is told and follows', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    const first = await passage(host)
    await finishBoth(host, guest)

    await host.page.getByRole('button', { name: 'Rematch' }).click()
    await expect(gate(host)).toBeVisible()
    await expect(seatState(host, 'Grace')).toHaveText('NOT BACK YET')
    await expect(host.page.getByText('Grace is still looking at the results.')).toBeVisible()

    // The guest keeps their result, not torn down and replayed, with a note
    // that Ada is ready to go again.
    await expect(guest.page.locator('.tt-verdict.is-in')).toBeVisible({ timeout: 500 })
    await expect(gate(guest)).toHaveCount(0)
    await expect(guest.page.locator('.tt-rematch-note')).toHaveText('Ada is ready for a rematch')

    // Ada cannot start without her: her Ready changes nothing yet.
    await readyButton(host).click()
    await host.page.waitForTimeout(1200)
    await expect(host.page.locator('.tt-countdown-number')).toHaveCount(0)

    await guest.page.getByRole('button', { name: 'Rematch' }).click()
    await expect(gate(guest)).toBeVisible()
    await expect(seatState(host, 'Grace')).toHaveText('NOT READY')
    await readyButton(guest).click()
    await expect(host.page.locator('.tt-race-text')).toBeVisible({ timeout: 10_000 })
    expect(await passage(host)).not.toBe(first)

    await finishBoth(host, guest)
    for (const player of [host, guest]) {
      await expect(player.page.getByText('Could not start a rematch.')).toHaveCount(0)
      await expect(player.page.locator('.tt-race-error')).toHaveCount(0)
    }
    expectNoErrors(host, guest)
  })

  test('both pressing Rematch at the same instant land both in the lobby, with no error', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await finishBoth(host, guest)

    // A normal click waits for the button to settle; these go straight to the
    // DOM so the two presses land together.
    const pressRematch = (player: Player) =>
      player.page.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Rematch')
        button?.click()
      })
    await Promise.all([pressRematch(host), pressRematch(guest)])
    await expect(gate(host)).toBeVisible()
    await expect(gate(guest)).toBeVisible()
    await expect(seatState(host, 'Grace')).toHaveText('NOT READY')
    await expect(seatState(guest, 'Ada')).toHaveText('NOT READY')
    for (const player of [host, guest]) {
      await expect(player.page.locator('.tt-race-error')).toHaveCount(0)
    }
    expectNoErrors(host, guest)
  })
})

test.describe('when a connection goes wrong', () => {
  test('an opponent who closes their browser is announced, marked as left, and named in the result', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await typeUpTo(host, 120)
    await guest.context.close()

    await expect(host.page.locator('.tt-race-toast')).toHaveText('Grace disconnected')
    await expect(host.page.locator('.tt-gone-tag')).toHaveText('left')

    await typeUpTo(host, 1e9)
    await expect(host.page.locator('.tt-verdict.is-in')).toHaveText('Your opponent left the race.', {
      timeout: 15_000,
    })
    await expect(host.page.getByRole('button', { name: 'Rematch' })).toBeDisabled()
    expectNoErrors(host)
  })

  test('a connection dropped mid-race comes back into the same race and still gets the result', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    const text = (await passage(host))!
    await typeUpTo(host, 150)
    await typeUpTo(guest, 100)

    await guest.goOffline()
    await expect(guest.page.getByText('Reconnecting…')).toBeVisible()
    await expect(host.page.locator('.tt-race-toast')).toHaveText('Grace disconnected')

    guest.goOnline()
    await expect(host.page.locator('.tt-race-toast')).toHaveText('Grace is back', { timeout: 15_000 })
    await expect(guest.page.getByText('Reconnecting…')).toHaveCount(0)

    // Their typing counts again.
    await typeUpTo(guest, 320)
    await expect(standing(host)).toHaveText(`Grace is ${wordsBetween(text, 150, 320)} words ahead`)

    await finishBoth(host, guest)
    expectNoErrors(host, guest)
  })

  test('a phone back online rejoins at once instead of waiting out an attempt that stalled', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await guest.goOffline()
    await expect(host.page.locator('.tt-race-toast')).toHaveText('Grace disconnected')
    // Long enough for socket.io to begin an attempt, which stalls while the connection is down.
    await guest.page.waitForTimeout(2_500)

    guest.goOnline()
    await guest.page.evaluate(() => window.dispatchEvent(new Event('online')))
    // Left alone, the stalled attempt runs on to its 8-second timeout first.
    await expect(host.page.locator('.tt-race-toast')).toHaveText('Grace is back', { timeout: 4_000 })
    await expect(guest.page.getByText('Reconnecting…')).toHaveCount(0)

    await finishBoth(host, guest)
    expectNoErrors(host, guest)
  })

  test('a page shown again replaces a connection that went quiet, without waiting for the heartbeat', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    const text = (await passage(host))!
    const before = guest.connections()

    guest.goQuiet()
    await guest.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    // The heartbeat notices a silent connection 8 to 18 seconds on. Asking the
    // server for an answer takes four.
    await expect.poll(() => guest.connections(), { timeout: 7_000 }).toBeGreaterThan(before)

    // The race carries on over the new connection.
    let reach = 200
    await expect(async () => {
      reach += 1
      await typeUpTo(guest, reach)
      await expect(standing(host)).toHaveText(`Grace is ${wordsBetween(text, 0, reach)} words ahead`, {
        timeout: 1_000,
      })
    }).toPass({ timeout: 10_000 })

    await finishBoth(host, guest)
    expectNoErrors(host, guest)
  })

  test('a player who drops at the gate shows as away, keeps their seat, and can still race', async ({ browser }) => {
    const { host, guest } = await atGate(browser)

    await guest.goOffline()
    await expect(seatState(host, 'Grace')).toHaveText('AWAY')
    await expect(host.page.getByText('Grace dropped out. Their seat is held for two minutes')).toBeVisible()

    guest.goOnline()
    await expect(seatState(host, 'Grace')).toHaveText('NOT READY', { timeout: 15_000 })

    await readyButton(host).click()
    await readyButton(guest).click()
    await expect(host.page.locator('.tt-countdown-number')).toBeVisible({ timeout: 10_000 })
    await expect(guest.page.locator('.tt-countdown-number')).toBeVisible({ timeout: 10_000 })
    expectNoErrors(host, guest)
  })

  test('reloading mid-race lands back in the race, not on the setup screen', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await typeUpTo(guest, 80)

    await guest.page.reload()
    await expect(guest.page.locator('.tt-race-text')).toBeVisible({ timeout: 15_000 })
    await expect(guest.page.getByRole('heading', { name: 'Race someone.' })).toHaveCount(0)
    await expect(host.page.locator('.tt-race-toast')).toHaveText('Grace is back', { timeout: 15_000 })

    await finishBoth(host, guest)
    expectNoErrors(host, guest)
  })

  test('leaving mid-race from the header returns to setup and tells the other player', async ({ browser }) => {
    const { host, guest } = await racing(browser)
    await guest.page.locator('.tt-race-bar').getByRole('button', { name: 'Leave' }).click()
    await expect(guest.page.getByRole('heading', { name: 'Race someone.' })).toBeVisible()
    await expect(host.page.locator('.tt-race-toast')).toHaveText('Grace disconnected')
    expectNoErrors(host, guest)
  })
})

test.describe('phone, 390px', () => {
  const noSidewaysScroll = (player: Player) =>
    player.page.evaluate(() => {
      const root = document.getElementById('root')!
      return (
        document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
        root.scrollWidth <= root.clientWidth
      )
    })

  test('every phase fits, targets are big enough, and nothing hides under the coffee button', async ({ browser }) => {
    const host = await openPlayer(browser, { device: PHONE })
    const guest = await openPlayer(browser, { device: PHONE })
    const { page } = host

    expect(await noSidewaysScroll(host)).toBe(true)

    // Every control on setup is a comfortable thumb target.
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.tt-setkey, .tt-btn, .tt-namefield, .tt-code-input')]
        .map((el) => ({ label: el.textContent?.trim() || el.getAttribute('aria-label'), h: el.getBoundingClientRect().height }))
        .filter((el) => el.h < 44)
    )
    expect(small).toEqual([])

    // The Join key, scrolled into view, is the element under its own centre.
    const join = page.getByRole('button', { name: 'Join', exact: true })
    await join.scrollIntoViewIfNeeded()
    const box = (await join.boundingBox())!
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.textContent?.trim(),
      { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    )
    expect(hit).toBe('Join')

    const code = await createRoom(host, 'Ada')
    expect(await noSidewaysScroll(host)).toBe(true)
    expect((await host.page.locator('.tt-step-back').boundingBox())!.height).toBeGreaterThanOrEqual(44)

    // The name step fits too, with every control a thumb target.
    await guest.page.getByLabel('Room code').fill(code)
    await guest.page.getByRole('button', { name: 'Join', exact: true }).click()
    await expect(guest.page.getByRole('heading', { name: 'Ada is waiting.' })).toBeVisible()
    expect(await noSidewaysScroll(guest)).toBe(true)
    const cramped = await guest.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.tt-step-back, .tt-btn, .tt-namefield')]
        .map((el) => ({ label: el.textContent?.trim() || el.id, h: el.getBoundingClientRect().height }))
        .filter((el) => el.h < 44)
    )
    expect(cramped).toEqual([])
    await guest.page.getByLabel('Your name').fill('Samantha')
    await guest.page.getByRole('button', { name: 'Join the race' }).click()
    await expect(gate(host)).toBeVisible()
    expect(await noSidewaysScroll(host)).toBe(true)
    expect(await noSidewaysScroll(guest)).toBe(true)

    await readyButton(host).click()
    await readyButton(guest).click()
    await expect(host.page.locator('.tt-race-text')).toBeVisible({ timeout: 10_000 })
    await typeUpTo(host, 260)
    await typeUpTo(guest, 120)
    await expect(guest.page.locator('.tt-opp-here')).toHaveCount(1)
    expect(await noSidewaysScroll(guest)).toBe(true)

    await finishBoth(host, guest)
    expect(await noSidewaysScroll(host)).toBe(true)
    // Both name keys share one column, so they are the same width whatever the names.
    const widths = await host.page.locator('.tt-namekey.is-big').evaluateAll((keys) =>
      keys.map((k) => Math.round(k.getBoundingClientRect().width))
    )
    expect(new Set(widths).size).toBe(1)
    const clipped = await host.page
      .locator('.tt-namekey.is-big')
      .evaluateAll((keys) => keys.filter((k) => k.scrollWidth > k.clientWidth + 1).length)
    expect(clipped).toBe(0)
    expectNoErrors(host, guest)
  })
})

test.describe('theme', () => {
  test('the race page follows the theme toggle', async ({ browser }) => {
    const player = await openPlayer(browser)
    const { page } = player
    const background = () => page.locator('.tt-race').evaluate((el) => getComputedStyle(el).backgroundColor)
    const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'))

    const before = await background()
    const wasDark = await isDark()
    await page.locator('.tt-race-bar button').last().click()
    await expect.poll(isDark).toBe(!wasDark)
    expect(await background()).not.toBe(before)
    expectNoErrors(player)
  })
})
