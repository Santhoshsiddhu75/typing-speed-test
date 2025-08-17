import { test, expect } from '@playwright/test'

test.describe('SetupScreen Step-Based Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/setup')
  })

  test('should show timer selection step first', async ({ page }) => {
    // Check initial step is timer
    await expect(page.getByRole('heading', { name: 'Choose Timer' })).toBeVisible()
    
    // Timer options should be visible
    await expect(page.getByTestId('timer-option-1')).toBeVisible()
    await expect(page.getByTestId('timer-option-2')).toBeVisible()
    await expect(page.getByTestId('timer-option-5')).toBeVisible()
    
    // Difficulty options should not be visible
    await expect(page.getByTestId('difficulty-option-easy')).not.toBeVisible()
    
    // Start button should not be visible yet
    await expect(page.getByTestId('start-test-button')).not.toBeVisible()
  })

  test('should advance to difficulty step after timer selection', async ({ page }) => {
    // Select a timer
    await page.getByTestId('timer-option-2').click()
    
    // Wait for transition and check difficulty step
    await expect(page.getByRole('heading', { name: 'Select Difficulty' })).toBeVisible()
    
    // Difficulty options should be visible
    await expect(page.getByTestId('difficulty-option-easy')).toBeVisible()
    await expect(page.getByTestId('difficulty-option-medium')).toBeVisible()
    await expect(page.getByTestId('difficulty-option-hard')).toBeVisible()
    
    // Timer options should not be visible
    await expect(page.getByTestId('timer-option-1')).not.toBeVisible()
    
    // Start button should not be visible yet
    await expect(page.getByTestId('start-test-button')).not.toBeVisible()
  })

  test('should advance to ready step after difficulty selection', async ({ page }) => {
    // Select timer
    await page.getByTestId('timer-option-2').click()
    
    // Wait for difficulty step and select difficulty
    await expect(page.getByRole('heading', { name: 'Select Difficulty' })).toBeVisible()
    await page.getByTestId('difficulty-option-medium').click()
    
    // Wait for ready step
    await expect(page.getByRole('heading', { name: 'Ready to Start' })).toBeVisible()
    
    // Start button should now be visible
    await expect(page.getByTestId('start-test-button')).toBeVisible()
    
    // Should show summary of selections
    await expect(page.getByText('2 minutes', { exact: true })).toBeVisible()
    await expect(page.getByText('medium difficulty', { exact: true })).toBeVisible()
  })

  test('should allow back navigation between steps', async ({ page }) => {
    // Select timer to advance to difficulty
    await page.getByTestId('timer-option-2').click()
    await expect(page.getByRole('heading', { name: 'Select Difficulty' })).toBeVisible()
    
    // Back button should be visible
    const backButton = page.getByRole('button', { name: 'Go back to previous step' })
    await expect(backButton).toBeVisible()
    
    // Click back to return to timer selection
    await backButton.click()
    await expect(page.getByRole('heading', { name: 'Choose Timer' })).toBeVisible()
    
    // Timer should still be selected
    await expect(page.getByTestId('timer-option-2')).toHaveClass(/selection-card-active/)
  })

  test('should show step progression with visual indicators', async ({ page }) => {
    // Verify we start at timer step
    await expect(page.getByRole('heading', { name: 'Choose Timer' })).toBeVisible()
    
    // Select timer and verify progression to difficulty
    await page.getByTestId('timer-option-2').click()
    await expect(page.getByRole('heading', { name: 'Select Difficulty' })).toBeVisible()
    
    // Select difficulty and verify progression to ready
    await page.getByTestId('difficulty-option-medium').click()
    await expect(page.getByRole('heading', { name: 'Ready to Start' })).toBeVisible()
    
    // Verify we can see progress visually through the step titles
    await expect(page.getByText('All Set!')).toBeVisible()
  })

  test('should start test from ready step', async ({ page }) => {
    // Complete both selections
    await page.getByTestId('timer-option-2').click()
    await expect(page.getByRole('heading', { name: 'Select Difficulty' })).toBeVisible()
    await page.getByTestId('difficulty-option-medium').click()
    await expect(page.getByRole('heading', { name: 'Ready to Start' })).toBeVisible()
    
    // Click start test button
    await page.getByTestId('start-test-button').click()
    
    // Should navigate to test page
    await expect(page).toHaveURL(/\/test\?/)
    await expect(page).toHaveURL(/timer=2/)
    await expect(page).toHaveURL(/difficulty=medium/)
  })
})