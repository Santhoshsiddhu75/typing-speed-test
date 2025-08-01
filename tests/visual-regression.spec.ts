import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test('Setup screen visual consistency', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('setup-screen-full.png', {
      fullPage: true,
      threshold: 0.2,
    })
  })

  test('Typing test screen visual consistency', async ({ page }) => {
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Take screenshot before typing
    await expect(page).toHaveScreenshot('typing-screen-initial.png', {
      fullPage: true,
      threshold: 0.2,
    })
    
    // Type some text
    await page.getByTestId('typing-input').fill('The sun was')
    
    // Take screenshot after typing
    await expect(page).toHaveScreenshot('typing-screen-with-input.png', {
      fullPage: true,
      threshold: 0.2,
    })
  })

  test('Results modal visual consistency', async ({ page }) => {
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Complete the test quickly
    const fullText = await page.getByTestId('typing-area').textContent()
    await page.getByTestId('typing-input').fill(fullText!)
    
    // Wait for modal to appear
    await expect(page.getByTestId('results-modal')).toBeVisible()
    
    // Take screenshot of modal
    await expect(page.getByTestId('results-modal')).toHaveScreenshot('results-modal.png', {
      threshold: 0.2,
    })
  })

  test('Dark mode visual consistency', async ({ page }) => {
    // Add dark mode class
    await page.addStyleTag({
      content: `
        html { color-scheme: dark; }
        .dark {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
          --card: 222.2 84% 4.9%;
          --card-foreground: 210 40% 98%;
          --primary: 217.2 91.2% 59.8%;
          --muted: 217.2 32.6% 17.5%;
          --muted-foreground: 215 20.2% 65.1%;
          --border: 217.2 32.6% 17.5%;
        }
      `
    })
    
    await page.addStyleTag({
      content: 'html { @apply dark; }'
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('setup-screen-dark.png', {
      fullPage: true,
      threshold: 0.2,
    })
  })

  test('Mobile viewport visual consistency', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('setup-screen-mobile.png', {
      fullPage: true,
      threshold: 0.2,
    })
  })

  test('Tablet viewport visual consistency', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('setup-screen-tablet.png', {
      fullPage: true,
      threshold: 0.2,
    })
  })

  test('Character state visual indicators', async ({ page }) => {
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Type some correct and incorrect characters
    await page.getByTestId('typing-input').fill('The sxn') // 'x' instead of 'u'
    
    // Take screenshot showing different character states
    await expect(page.getByTestId('typing-area')).toHaveScreenshot('character-states.png', {
      threshold: 0.2,
    })
  })

  test('Stats cards visual consistency', async ({ page }) => {
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Type some text to generate stats
    await page.getByTestId('typing-input').fill('The sun was shining bright')
    
    // Take screenshot of stats section
    const statsSection = page.locator('.grid.grid-cols-2.md\\:grid-cols-4')
    await expect(statsSection).toHaveScreenshot('stats-cards.png', {
      threshold: 0.2,
    })
  })
})