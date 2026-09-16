import { defineConfig, devices } from '@playwright/test'

/**
 * The race suite, kept apart from the older tests in ./tests.
 *
 *   npm run test:race                          everything
 *   npm run test:race -- --project=server      socket protocol only
 *   npm run test:race -- --project=webkit      the iPhone engine
 *
 * Serial on purpose: every test talks to one shared race server, and two
 * browsers racing each other are timing-sensitive enough without a third and
 * fourth competing for the CPU.
 *
 * Starts the API/race server and the Vite client if they are not already
 * running. RACE_SERVER_URL points the protocol tests at a different server —
 * a compiled production build, say — without touching the browser tests.
 */
export default defineConfig({
  testDir: './tests/race',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.RACE_APP_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // The protocol has no browser in it, so it runs once rather than per engine.
    { name: 'server', testMatch: /protocol\.spec\.ts/ },
    { name: 'chromium', testMatch: /(ui|regression)\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    // iPhone Safari is WebKit, and most TapTest traffic is expected from phones.
    { name: 'webkit', testMatch: /(ui|regression)\.spec\.ts/, use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', testMatch: /(ui|regression)\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [
    {
      command: 'npm run server:dev',
      url: 'http://localhost:3003/race-socket/?EIO=4&transport=polling',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
