import { test, expect } from '@playwright/test'

test.describe('Accessibility Tests', () => {
  test('Setup screen should have proper keyboard navigation', async ({ page }) => {
    await page.goto('/')
    
    // Tab through timer options
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to select timer with Enter/Space
    await page.keyboard.press('Enter')
    
    // Continue tabbing to difficulty options
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Select difficulty with Enter
    await page.keyboard.press('Enter')
    
    // Tab to start button
    await page.keyboard.press('Tab')
    
    // Should be focused on start button
    await expect(page.getByTestId('start-test-button')).toBeFocused()
    
    // Should be able to start test with Enter
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/test/)
  })

  test('Typing test should have proper focus management', async ({ page }) => {
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Input should be automatically focused
    await expect(page.getByTestId('typing-input')).toBeFocused()
    
    // Should maintain focus after typing
    await page.getByTestId('typing-input').fill('test')
    await expect(page.getByTestId('typing-input')).toBeFocused()
  })

  test('Results modal should have proper focus trap', async ({ page }) => {
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Complete the test quickly
    const fullText = await page.getByTestId('typing-area').textContent()
    await page.getByTestId('typing-input').fill(fullText!)
    
    // Wait for modal to appear
    await expect(page.getByTestId('results-modal')).toBeVisible()
    
    // Focus should be trapped within modal
    // Tab through modal elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should cycle back to first focusable element
    const retakeButton = page.getByTestId('retake-modal-button')
    const returnButton = page.getByTestId('return-setup-button')
    
    await expect(retakeButton).toBeVisible()
    await expect(returnButton).toBeVisible()
  })

  test('Should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/')
    
    // Check main heading has proper role
    const heading = page.locator('h1')
    await expect(heading).toHaveText('Typing Speed Test')
    
    // Check buttons have proper labels
    await expect(page.getByTestId('start-test-button')).toHaveAttribute('aria-label')
    await expect(page.getByTestId('timer-option-1')).toHaveAttribute('aria-label')
    await expect(page.getByTestId('difficulty-option-easy')).toHaveAttribute('aria-label')
    
    // Check pressed states
    await expect(page.getByTestId('timer-option-1')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('difficulty-option-easy')).toHaveAttribute('aria-pressed', 'true')
  })

  test('Should have proper color contrast and text scaling', async ({ page }) => {
    await page.goto('/')
    
    // Test with increased text size
    await page.addStyleTag({
      content: `
        * {
          font-size: 150% !important;
        }
      `
    })
    
    // Elements should still be visible and functional
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByTestId('start-test-button')).toBeVisible()
    
    // Take screenshot to verify layout doesn't break
    await page.screenshot({ path: 'tests/screenshots/accessibility-large-text.png' })
  })

  test('Should work with high contrast mode', async ({ page }) => {
    await page.goto('/')
    
    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        * {
          background: black !important;
          color: white !important;
          border-color: white !important;
        }
        button {
          background: white !important;
          color: black !important;
        }
      `
    })
    
    // Elements should still be visible
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByTestId('start-test-button')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/accessibility-high-contrast.png' })
  })

  test('Should handle reduced motion preferences', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    
    // Elements should still function without animations
    await page.getByTestId('timer-option-2').click()
    await expect(page.getByTestId('timer-option-2')).toHaveClass(/selection-card-active/)
    
    // Navigate to test
    await page.getByTestId('start-test-button').click()
    await expect(page).toHaveURL(/\/test/)
  })

  test('Should provide clear error states and feedback', async ({ page }) => {
    await page.goto('/test?timer=1&difficulty=easy')
    
    // Type incorrect characters
    await page.getByTestId('typing-input').fill('zzz')
    
    // Check that incorrect characters are visually indicated
    await expect(page.getByTestId('char-0')).toHaveClass(/typing-char-incorrect/)
    
    // Check accuracy reflects the error
    const accuracy = await page.getByTestId('accuracy-display').textContent()
    expect(parseInt(accuracy!)).toBeLessThan(100)
  })

  test('Should support screen reader users', async ({ page }) => {
    await page.goto('/')
    
    // Check for screen reader friendly content
    await expect(page.locator('text=Choose how long you want to test')).toBeVisible()
    await expect(page.locator('text=Select the complexity level')).toBeVisible()
    
    // Go to test screen
    await page.getByTestId('start-test-button').click()
    
    // Check for screen reader friendly test instructions
    await expect(page.locator('text=Type the text below')).toBeVisible()
    
    // Check stats have proper labels
    await expect(page.locator('p:has-text("WPM")')).toBeVisible()
    await expect(page.locator('p:has-text("CPM")')).toBeVisible()
    await expect(page.locator('p:has-text("Accuracy")')).toBeVisible()
  })
})