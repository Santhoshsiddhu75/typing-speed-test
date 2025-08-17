import { test, expect } from '@playwright/test'

test.describe('LoginForm Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page containing the LoginForm
    // Adjust this URL based on where you mount the component
    await page.goto('/login') // or wherever your LoginForm is rendered
  })

  test('should render all form elements', async ({ page }) => {
    // Check that all form elements are present
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByLabelText('Email')).toBeVisible()
    await expect(page.getByLabelText('Password')).toBeVisible()
    await expect(page.getByLabelText('Remember me')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    
    // Check that icons are present
    await expect(page.locator('[data-testid="mail-icon"]')).toBeVisible()
    await expect(page.locator('[data-testid="lock-icon"]')).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling fields
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Check validation errors appear
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.getByLabelText('Email').fill('invalid-email')
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    await expect(page.getByText('Please enter a valid email address')).toBeVisible()
  })

  test('should validate password length', async ({ page }) => {
    // Enter short password
    await page.getByLabelText('Email').fill('test@example.com')
    await page.getByLabelText('Password').fill('12345')
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    await expect(page.getByText('Password must be at least 6 characters long')).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabelText('Password')
    const toggleButton = page.getByRole('button', { name: 'Show password' })
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')
    
    // Click toggle to show password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible()
    
    // Click toggle to hide password again
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should handle remember me checkbox', async ({ page }) => {
    const checkbox = page.getByLabelText('Remember me')
    
    // Initially unchecked
    await expect(checkbox).not.toBeChecked()
    
    // Click to check
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    
    // Click to uncheck
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('should show loading state during submission', async ({ page }) => {
    // Fill valid form data
    await page.getByLabelText('Email').fill('test@example.com')
    await page.getByLabelText('Password').fill('password123')
    
    // Click submit
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Check loading state
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible()
    await expect(page.getByTestId('loading-spinner')).toBeVisible()
    
    // Wait for loading to complete
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 5000 })
  })

  test('should handle forgot password click', async ({ page }) => {
    // Setup page to listen for console logs or navigation
    const messages: string[] = []
    page.on('console', msg => messages.push(msg.text()))
    
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    
    // Verify forgot password handler was called
    // This will depend on your implementation
    expect(messages.some(msg => msg.includes('Forgot password'))).toBe(true)
  })

  test('should clear field errors when user starts typing', async ({ page }) => {
    // Trigger validation errors
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Email is required')).toBeVisible()
    
    // Start typing in email field
    await page.getByLabelText('Email').fill('t')
    
    // Error should disappear
    await expect(page.getByText('Email is required')).not.toBeVisible()
  })

  test('should be keyboard accessible', async ({ page }) => {
    // Tab through form elements
    await page.keyboard.press('Tab') // Email field
    await expect(page.getByLabelText('Email')).toBeFocused()
    
    await page.keyboard.press('Tab') // Password field
    await expect(page.getByLabelText('Password')).toBeFocused()
    
    await page.keyboard.press('Tab') // Password toggle
    await expect(page.getByRole('button', { name: 'Show password' })).toBeFocused()
    
    await page.keyboard.press('Tab') // Remember me checkbox
    await expect(page.getByLabelText('Remember me')).toBeFocused()
    
    await page.keyboard.press('Tab') // Forgot password link
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeFocused()
    
    await page.keyboard.press('Tab') // Submit button
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused()
  })

  test('should submit form with Enter key', async ({ page }) => {
    // Fill form
    await page.getByLabelText('Email').fill('test@example.com')
    await page.getByLabelText('Password').fill('password123')
    
    // Press Enter while focused on password field
    await page.getByLabelText('Password').press('Enter')
    
    // Form should submit (check for loading state)
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible()
  })

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check ARIA labels and descriptions
    const emailInput = page.getByLabelText('Email')
    const passwordInput = page.getByLabelText('Password')
    
    await expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'false')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    
    // Trigger validation errors
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Check ARIA attributes are updated
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
  })

  test('should display error messages with proper roles', async ({ page }) => {
    // Trigger validation
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Check error messages have alert role
    await expect(page.locator('[role="alert"]')).toHaveCount(2) // email and password errors
  })

  test('should handle form submission with valid data', async ({ page }) => {
    // Mock successful login response if needed
    // await page.route('**/api/login', route => route.fulfill({ json: { success: true } }))
    
    // Fill form with valid data
    await page.getByLabelText('Email').fill('test@example.com')
    await page.getByLabelText('Password').fill('password123')
    await page.getByLabelText('Remember me').check()
    
    // Submit form
    await page.getByRole('button', { name: 'Sign in' }).click()
    
    // Verify form data is submitted correctly
    // This will depend on your onSubmit implementation
    // You might check for navigation, success message, or API calls
  })
})