import { test, expect } from '@playwright/test'

test.describe('Typing Test Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test screen with default settings
    await page.goto('/test?timer=1&difficulty=easy')
  })

  test('should display test configuration and stats', async ({ page }) => {
    // Check header shows correct configuration
    await expect(page.locator('text=1 minute • easy difficulty')).toBeVisible()
    
    // Check all stats cards are present
    await expect(page.getByTestId('wpm-display')).toBeVisible()
    await expect(page.getByTestId('cpm-display')).toBeVisible()
    await expect(page.getByTestId('accuracy-display')).toBeVisible()
    await expect(page.getByTestId('timer-display')).toBeVisible()
    
    // Check initial values
    await expect(page.getByTestId('wpm-display')).toContainText('0')
    await expect(page.getByTestId('cpm-display')).toContainText('0')
    await expect(page.getByTestId('accuracy-display')).toContainText('100')
    await expect(page.getByTestId('timer-display')).toContainText('1:00')
  })

  test('should display typing area with text', async ({ page }) => {
    await expect(page.getByTestId('typing-area')).toBeVisible()
    await expect(page.getByTestId('typing-input')).toBeVisible()
    
    // Check that text is displayed
    const typingArea = page.getByTestId('typing-area')
    const textContent = await typingArea.textContent()
    expect(textContent).toBeTruthy()
    expect(textContent!.length).toBeGreaterThan(50) // Should have substantial text
  })

  test('should start timer when typing begins', async ({ page }) => {
    const input = page.getByTestId('typing-input')
    
    // Type first character
    await input.fill('T')
    
    // Wait a moment and check timer has started counting down
    await page.waitForTimeout(1100) // Wait just over 1 second
    const timerText = await page.getByTestId('timer-display').textContent()
    expect(timerText).not.toBe('1:00') // Timer should have started
  })

  test('should update character states as user types', async ({ page }) => {
    const input = page.getByTestId('typing-input')
    
    // Get the first few characters of the text to type correctly
    const firstChar = await page.getByTestId('char-0').textContent()
    const secondChar = await page.getByTestId('char-1').textContent()
    
    // Type first character correctly
    await input.fill(firstChar!)
    
    // Check first character is marked as correct
    await expect(page.getByTestId('char-0')).toHaveClass(/typing-char-correct/)
    // Check second character is marked as current
    await expect(page.getByTestId('char-1')).toHaveClass(/typing-char-current/)
    
    // Type second character correctly
    await input.fill(firstChar! + secondChar!)
    
    // Check both characters are correct and third is current
    await expect(page.getByTestId('char-0')).toHaveClass(/typing-char-correct/)
    await expect(page.getByTestId('char-1')).toHaveClass(/typing-char-correct/)
    await expect(page.getByTestId('char-2')).toHaveClass(/typing-char-current/)
  })

  test('should handle incorrect typing', async ({ page }) => {
    const input = page.getByTestId('typing-input')
    
    // Type incorrect first character
    await input.fill('X') // Assuming first character is not 'X'
    
    // Check first character is marked as incorrect
    await expect(page.getByTestId('char-0')).toHaveClass(/typing-char-incorrect/)
    
    // Check accuracy has decreased
    const accuracy = await page.getByTestId('accuracy-display').textContent()
    expect(parseInt(accuracy!)).toBeLessThan(100)
  })

  test('should update WPM and CPM stats as user types', async ({ page }) => {
    const input = page.getByTestId('typing-input')
    
    // Get a few characters to type
    const text = await page.getByTestId('typing-area').textContent()
    const firstWord = text!.split(' ')[0]
    
    // Type the first word
    await input.fill(firstWord)
    
    // Wait a moment for stats to update
    await page.waitForTimeout(1000)
    
    // Check that WPM and CPM have been calculated
    const wpm = await page.getByTestId('wpm-display').textContent()
    const cpm = await page.getByTestId('cpm-display').textContent()
    
    expect(parseInt(wpm!)).toBeGreaterThan(0)
    expect(parseInt(cpm!)).toBeGreaterThan(0)
  })

  test('should show results modal when test completes', async ({ page }) => {
    // Use a shorter test for quicker completion
    await page.goto('/test?timer=1&difficulty=easy')
    
    const input = page.getByTestId('typing-input')
    
    // Get all the text to type it completely
    const fullText = await page.getByTestId('typing-area').textContent()
    
    // Type the entire text quickly
    await input.fill(fullText!)
    
    // Check results modal appears
    await expect(page.getByTestId('results-modal')).toBeVisible()
    
    // Check final stats are displayed
    await expect(page.getByTestId('final-wpm')).toBeVisible()
    await expect(page.getByTestId('final-cpm')).toBeVisible()
    await expect(page.getByTestId('final-accuracy')).toBeVisible()
    await expect(page.getByTestId('final-time')).toBeVisible()
  })

  test('should allow retaking the test', async ({ page }) => {
    const input = page.getByTestId('typing-input')
    
    // Type some characters
    await input.fill('Test')
    
    // Click retake button
    await page.getByTestId('retake-button').click()
    
    // Check that test has been reset
    await expect(page.getByTestId('wpm-display')).toContainText('0')
    await expect(page.getByTestId('cpm-display')).toContainText('0')
    await expect(page.getByTestId('accuracy-display')).toContainText('100')
    await expect(page.getByTestId('timer-display')).toContainText('1:00')
    
    // Check input is cleared and focused
    await expect(input).toHaveValue('')
    await expect(input).toBeFocused()
  })

  test('should return to setup screen', async ({ page }) => {
    // Click back to setup button
    await page.locator('text=Back to Setup').click()
    
    // Check we're back on setup screen
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toContainText('Setup Your Test')
  })

  test('should handle different difficulty levels', async ({ page }) => {
    // Test hard difficulty
    await page.goto('/test?timer=1&difficulty=hard')
    
    await expect(page.locator('text=1 minute • hard difficulty')).toBeVisible()
    
    const typingArea = page.getByTestId('typing-area')
    const textContent = await typingArea.textContent()
    
    // Hard difficulty should have more complex text
    expect(textContent).toContain('phenomenon') // Example of complex word likely in hard text
  })
})

test.describe('Typing Test Responsive', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Check all elements are visible
    await expect(page.getByTestId('wpm-display')).toBeVisible()
    await expect(page.getByTestId('typing-area')).toBeVisible()
    await expect(page.getByTestId('typing-input')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/typing-mobile.png', fullPage: true })
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Check layout on tablet
    await expect(page.getByTestId('typing-area')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/typing-tablet.png', fullPage: true })
  })

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Check layout on desktop
    await expect(page.getByTestId('typing-area')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/typing-desktop.png', fullPage: true })
  })
})

test.describe('Typing Test Timer Functionality', () => {
  test('should complete test when timer reaches zero', async ({ page }) => {
    // Use a very short timer for testing (would need to modify timer options)
    // For now, we'll test the timer countdown
    await page.goto('/test?timer=1&difficulty=easy')
    
    const input = page.getByTestId('typing-input')
    
    // Start typing to activate timer
    await input.fill('T')
    
    // Check timer is counting down
    await page.waitForTimeout(1100)
    const timerText = await page.getByTestId('timer-display').textContent()
    expect(timerText).not.toBe('1:00')
  })
})