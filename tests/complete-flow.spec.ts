import { test, expect } from '@playwright/test'

test.describe('Complete Application Flow', () => {
  test('Complete typing test flow - Easy difficulty', async ({ page }) => {
    // Start on setup screen
    await page.goto('/')
    
    // Select 1 minute, easy difficulty (defaults)
    await expect(page.getByTestId('timer-option-1')).toHaveClass(/selection-card-active/)
    await expect(page.getByTestId('difficulty-option-easy')).toHaveClass(/selection-card-active/)
    
    // Start test
    await page.getByTestId('start-test-button').click()
    
    // Verify we're on test screen
    await expect(page).toHaveURL(/\/test\?timer=1&difficulty=easy/)
    await expect(page.locator('text=1 minute • easy difficulty')).toBeVisible()
    
    // Verify initial state
    await expect(page.getByTestId('wpm-display')).toContainText('0')
    await expect(page.getByTestId('timer-display')).toContainText('1:00')
    
    // Get the text to type
    const textToType = await page.getByTestId('typing-area').textContent()
    const words = textToType!.split(' ')
    const firstSentence = words.slice(0, 10).join(' ') // Type first 10 words
    
    // Start typing
    const input = page.getByTestId('typing-input')
    await input.fill(firstSentence)
    
    // Verify stats update
    await page.waitForTimeout(1000) // Wait for stats to update
    
    const wpm = await page.getByTestId('wpm-display').textContent()
    const accuracy = await page.getByTestId('accuracy-display').textContent()
    
    expect(parseInt(wpm!)).toBeGreaterThan(0)
    expect(parseInt(accuracy!)).toBeGreaterThanOrEqual(80) // Should be reasonably accurate
    
    // Verify timer started
    const timerText = await page.getByTestId('timer-display').textContent()
    expect(timerText).not.toBe('1:00')
    
    // Test retake functionality
    await page.getByTestId('retake-button').click()
    
    // Verify reset
    await expect(page.getByTestId('wpm-display')).toContainText('0')
    await expect(page.getByTestId('timer-display')).toContainText('1:00')
    await expect(input).toHaveValue('')
    await expect(input).toBeFocused()
  })

  test('Complete typing test flow - Hard difficulty', async ({ page }) => {
    // Start on setup screen
    await page.goto('/')
    
    // Select 2 minutes, hard difficulty
    await page.getByTestId('timer-option-2').click()
    await page.getByTestId('difficulty-option-hard').click()
    
    // Verify selections
    await expect(page.getByTestId('timer-option-2')).toHaveClass(/selection-card-active/)
    await expect(page.getByTestId('difficulty-option-hard')).toHaveClass(/selection-card-active/)
    
    // Check summary
    await expect(page.locator('text=2 minutes')).toBeVisible()
    await expect(page.locator('text=hard difficulty')).toBeVisible()
    
    // Start test
    await page.getByTestId('start-test-button').click()
    
    // Verify configuration
    await expect(page).toHaveURL(/\/test\?timer=2&difficulty=hard/)
    await expect(page.locator('text=2 minutes • hard difficulty')).toBeVisible()
    await expect(page.getByTestId('timer-display')).toContainText('2:00')
    
    // Verify hard text is more complex
    const textContent = await page.getByTestId('typing-area').textContent()
    expect(textContent).toContain('phenomenon') // Common word in hard texts
    
    // Type a portion of complex text
    const input = page.getByTestId('typing-input')
    await input.fill('The phenomenon')
    
    // Verify character tracking works with complex text
    await expect(page.getByTestId('char-0')).toHaveClass(/typing-char-correct/)
    await expect(page.getByTestId('char-1')).toHaveClass(/typing-char-correct/)
  })

  test('Complete test and view results', async ({ page }) => {
    await page.goto('/')
    
    // Select very short test for quick completion
    await page.getByTestId('timer-option-1').click()
    await page.getByTestId('difficulty-option-easy').click()
    
    await page.getByTestId('start-test-button').click()
    
    // Get and type the complete text
    const fullText = await page.getByTestId('typing-area').textContent()
    const input = page.getByTestId('typing-input')
    
    // Type entire text to complete test
    await input.fill(fullText!)
    
    // Verify results modal appears
    await expect(page.getByTestId('results-modal')).toBeVisible()
    
    // Check all result stats are present
    await expect(page.getByTestId('final-wpm')).toBeVisible()
    await expect(page.getByTestId('final-cpm')).toBeVisible()
    await expect(page.getByTestId('final-accuracy')).toBeVisible()
    await expect(page.getByTestId('final-time')).toBeVisible()
    
    // Verify stats have reasonable values
    const finalWpm = await page.getByTestId('final-wpm').textContent()
    const finalAccuracy = await page.getByTestId('final-accuracy').textContent()
    
    expect(parseInt(finalWpm!)).toBeGreaterThan(0)
    expect(parseInt(finalAccuracy!)).toBeGreaterThanOrEqual(90) // Perfect typing should be ~100%
    
    // Test modal buttons
    await page.getByTestId('retake-modal-button').click()
    
    // Should close modal and reset test
    await expect(page.getByTestId('results-modal')).not.toBeVisible()
    await expect(input).toHaveValue('')
    await expect(input).toBeFocused()
    
    // Test return to setup
    await page.locator('text=Back to Setup').click()
    await expect(page).toHaveURL('/')
  })

  test('Error handling - Invalid URL parameters', async ({ page }) => {
    // Test with invalid parameters
    await page.goto('/test?timer=invalid&difficulty=invalid')
    
    // Should still load with defaults or handle gracefully
    await expect(page.getByTestId('typing-area')).toBeVisible()
    await expect(page.getByTestId('typing-input')).toBeVisible()
  })

  test('Browser back/forward navigation', async ({ page }) => {
    // Start on setup
    await page.goto('/')
    
    // Navigate to test
    await page.getByTestId('start-test-button').click()
    await expect(page).toHaveURL(/\/test/)
    
    // Go back
    await page.goBack()
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toContainText('Typing Speed Test')
    
    // Go forward
    await page.goForward()
    await expect(page).toHaveURL(/\/test/)
    await expect(page.getByTestId('typing-area')).toBeVisible()
  })

  test('Typing behavior edge cases', async ({ page }) => {
    await page.goto('/test?timer=1&difficulty=easy')
    
    const input = page.getByTestId('typing-input')
    
    // Test backspace behavior
    await input.fill('Test')
    await input.press('Backspace')
    await expect(input).toHaveValue('Tes')
    
    // Test typing beyond text length (should be prevented)
    const fullText = await page.getByTestId('typing-area').textContent()
    const extendedText = fullText! + 'extra text that should not be allowed'
    
    await input.fill(extendedText)
    
    // Should be limited to original text length
    const inputValue = await input.inputValue()
    expect(inputValue.length).toBeLessThanOrEqual(fullText!.length)
  })

  test('Responsive behavior across screen sizes', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'desktop' },
      { width: 1920, height: 1080, name: 'large-desktop' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Test setup screen
      await page.goto('/')
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByTestId('start-test-button')).toBeVisible()
      
      // Test typing screen
      await page.getByTestId('start-test-button').click()
      await expect(page.getByTestId('typing-area')).toBeVisible()
      await expect(page.getByTestId('wpm-display')).toBeVisible()
      
      // Ensure layout doesn't break
      const statsCards = page.locator('.stats-card')
      const count = await statsCards.count()
      expect(count).toBe(4) // Should have 4 stat cards
    }
  })
})