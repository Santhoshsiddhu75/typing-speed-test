import { test, expect } from '@playwright/test'

test.describe('Setup Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the main title and description', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Setup Your Test')
    await expect(page.locator('text=Choose your preferred time limit to get started.')).toBeVisible()
  })

  test('should have timer selection options', async ({ page }) => {
    // Check all timer options are present
    await expect(page.getByTestId('timer-option-1')).toBeVisible()
    await expect(page.getByTestId('timer-option-2')).toBeVisible()
    await expect(page.getByTestId('timer-option-5')).toBeVisible()
    
    // Check default selection (1 minute)
    await expect(page.getByTestId('timer-option-1')).toHaveClass(/selection-card-active/)
  })

  test('should have difficulty selection options', async ({ page }) => {
    // Check all difficulty options are present
    await expect(page.getByTestId('difficulty-option-easy')).toBeVisible()
    await expect(page.getByTestId('difficulty-option-medium')).toBeVisible()
    await expect(page.getByTestId('difficulty-option-hard')).toBeVisible()
    
    // Check default selection (easy)
    await expect(page.getByTestId('difficulty-option-easy')).toHaveClass(/selection-card-active/)
  })

  test('should allow timer selection', async ({ page }) => {
    // Click on 2 minutes timer
    await page.getByTestId('timer-option-2').click()
    
    // Check that 2 minutes is now selected
    await expect(page.getByTestId('timer-option-2')).toHaveClass(/selection-card-active/)
    await expect(page.getByTestId('timer-option-1')).not.toHaveClass(/selection-card-active/)
    
    // Check summary updates
    await expect(page.locator('text=2 minutes')).toBeVisible()
  })

  test('should allow difficulty selection', async ({ page }) => {
    // Click on medium difficulty
    await page.getByTestId('difficulty-option-medium').click()
    
    // Check that medium is now selected
    await expect(page.getByTestId('difficulty-option-medium')).toHaveClass(/selection-card-active/)
    await expect(page.getByTestId('difficulty-option-easy')).not.toHaveClass(/selection-card-active/)
    
    // Check summary updates
    await expect(page.locator('text=medium difficulty')).toBeVisible()
  })

  test('should navigate to test screen with correct parameters', async ({ page }) => {
    // Select 2 minutes and hard difficulty
    await page.getByTestId('timer-option-2').click()
    await page.getByTestId('difficulty-option-hard').click()
    
    // Click start test
    await page.getByTestId('start-test-button').click()
    
    // Check URL contains correct parameters
    await expect(page).toHaveURL(/\/test\?timer=2&difficulty=hard/)
    
    // Check we're on the test screen
    await expect(page.locator('text=2 minutes • hard difficulty')).toBeVisible()
  })

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check ARIA labels and roles
    await expect(page.getByTestId('timer-option-1')).toHaveAttribute('aria-label', 'Select 1 Minute timer')
    await expect(page.getByTestId('difficulty-option-easy')).toHaveAttribute('aria-label', 'Select Easy difficulty')
    await expect(page.getByTestId('start-test-button')).toHaveAttribute('aria-label', 'Start TapTest')
    
    // Check pressed states
    await expect(page.getByTestId('timer-option-1')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('difficulty-option-easy')).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Setup Screen Responsive', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto('/')
    
    // Check elements are still visible and properly arranged
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByTestId('timer-option-1')).toBeVisible()
    await expect(page.getByTestId('difficulty-option-easy')).toBeVisible()
    await expect(page.getByTestId('start-test-button')).toBeVisible()
    
    // Take screenshot for visual regression testing
    await page.screenshot({ path: 'tests/screenshots/setup-mobile.png', fullPage: true })
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    await page.goto('/')
    
    // Check elements are properly arranged
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByTestId('start-test-button')).toBeVisible()
    
    // Take screenshot for visual regression testing
    await page.screenshot({ path: 'tests/screenshots/setup-tablet.png', fullPage: true })
  })

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    
    // Check elements are properly arranged
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByTestId('start-test-button')).toBeVisible()
    
    // Take screenshot for visual regression testing
    await page.screenshot({ path: 'tests/screenshots/setup-desktop.png', fullPage: true })
  })
})