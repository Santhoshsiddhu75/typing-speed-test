import { test, expect } from '@playwright/test';

// Additional enhanced tests for the new ProfilePage functionality
test.describe('Profile Page - Enhanced Features', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for authenticated user
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 1,
            username: 'testuser',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            google_id: null,
            profile_picture: null
          }
        })
      });
    });

    await page.route('**/api/tests/stats/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            username: 'testuser',
            total_tests: 25,
            average_wpm: 68.5,
            average_accuracy: 94.2,
            best_wpm: 89,
            best_accuracy: 98.5,
            total_time_spent: 150,
            improvement_trend: { wpm_change: 12, accuracy_change: 2.3 },
            difficulty_breakdown: { easy: 8, medium: 12, hard: 5 }
          }
        })
      });
    });

    await page.route('**/api/tests?**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            data: [
              {
                id: 1, wpm: 75, cpm: 375, accuracy: 96.2, totalTime: 120,
                difficulty: 'medium', created_at: '2024-01-15T14:30:00Z', username: 'testuser'
              },
              {
                id: 2, wpm: 82, cpm: 410, accuracy: 94.8, totalTime: 120,
                difficulty: 'hard', created_at: '2024-01-14T10:15:00Z', username: 'testuser'
              },
              {
                id: 3, wpm: 69, cpm: 345, accuracy: 97.1, totalTime: 60,
                difficulty: 'easy', created_at: '2024-01-13T16:45:00Z', username: 'testuser'
              }
            ],
            pagination: { total: 25, limit: 10, offset: 0, hasMore: true }
          }
        })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
    });

    await page.goto('/profile');
  });

  test('should navigate between tabs correctly', async ({ page }) => {
    // Check that Progress tab is active by default
    await expect(page.getByRole('tab', { name: 'Progress' })).toHaveAttribute('data-state', 'active');
    
    // Switch to Test History tab
    await page.getByRole('tab', { name: 'Test History' }).click();
    await expect(page.getByRole('tab', { name: 'Test History' })).toHaveAttribute('data-state', 'active');
    await expect(page.locator('text=Recent Tests')).toBeVisible();
    
    // Switch to Analytics tab  
    await page.getByRole('tab', { name: 'Analytics' }).click();
    await expect(page.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('data-state', 'active');
    await expect(page.locator('text=Performance Breakdown')).toBeVisible();
    await expect(page.locator('text=Difficulty Distribution')).toBeVisible();
  });

  test('should filter test history by difficulty', async ({ page }) => {
    // Navigate to Test History tab
    await page.getByRole('tab', { name: 'Test History' }).click();
    
    // Check that all tests are initially visible
    await expect(page.locator('text=75 WPM')).toBeVisible(); // medium
    await expect(page.locator('text=82 WPM')).toBeVisible(); // hard
    await expect(page.locator('text=69 WPM')).toBeVisible(); // easy
    
    // Find and use the difficulty filter dropdown
    const filterSelect = page.locator('select').first();
    
    // Filter by easy
    await filterSelect.selectOption('easy');
    await expect(page.locator('text=69 WPM')).toBeVisible();
    
    // Filter by hard
    await filterSelect.selectOption('hard');
    await expect(page.locator('text=82 WPM')).toBeVisible();
    
    // Reset to all
    await filterSelect.selectOption('all');
    await expect(page.locator('text=75 WPM')).toBeVisible();
    await expect(page.locator('text=82 WPM')).toBeVisible();
    await expect(page.locator('text=69 WPM')).toBeVisible();
  });

  test('should handle default settings updates', async ({ page }) => {
    // Mock the update API
    await page.route('**/api/users/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    // Test duration setting
    const duration1Button = page.getByRole('button', { name: /1m/ });
    const duration2Button = page.getByRole('button', { name: /2m/ });
    
    // Check that 2m is initially active (default)
    await expect(duration2Button).toHaveClass(/bg-primary/);
    
    // Click on 1 minute duration
    await duration1Button.click();
    await expect(duration1Button).toHaveClass(/bg-primary/);
    
    // Test difficulty setting
    const easyButton = page.getByRole('button', { name: /easy/ }).nth(1);
    const mediumButton = page.getByRole('button', { name: /medium/ }).nth(1);
    const hardButton = page.getByRole('button', { name: /hard/ }).nth(1);
    
    // Check that medium is initially active (default)
    await expect(mediumButton).toHaveClass(/bg-primary/);
    
    // Click on hard difficulty
    await hardButton.click();
    await expect(hardButton).toHaveClass(/bg-primary/);
  });

  test('should open and interact with edit profile dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Edit Profile/ }).first().click();
    
    // Check dialog opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('text=Edit Profile')).toBeVisible();
    await expect(page.locator('text=Update your username and preferences')).toBeVisible();
    
    // Check form fields
    const usernameInput = page.locator('#username');
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toHaveValue('testuser');
    
    // Test username validation pattern
    await expect(usernameInput).toHaveAttribute('pattern', '^[A-Za-z0-9_]{3,20}$');
    
    // Fill valid username
    await usernameInput.fill('newusername123');
    
    // Cancel dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should open and interact with change password dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Change Password/ }).click();
    
    // Check dialog opened
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('text=Change Password')).toBeVisible();
    await expect(page.locator('text=Update your account password. Make sure it\'s strong and secure.')).toBeVisible();
    
    // Check password fields
    const currentPasswordInput = page.locator('#current-password');
    const newPasswordInput = page.locator('#new-password');
    const confirmPasswordInput = page.locator('#confirm-password');
    
    await expect(currentPasswordInput).toBeVisible();
    await expect(newPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    
    // All should be password type initially
    await expect(currentPasswordInput).toHaveAttribute('type', 'password');
    await expect(newPasswordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    // Test password visibility toggle (there should be toggle buttons)
    const toggleButtons = page.locator('button').filter({ hasText: /👁|eye/i });
    
    // Fill password fields
    await currentPasswordInput.fill('currentpass123');
    await newPasswordInput.fill('newpass456');
    await confirmPasswordInput.fill('newpass456');
    
    // Cancel dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should open and handle delete all history with typed confirmation', async ({ page }) => {
    await page.getByRole('button', { name: /Delete All Test History/ }).click();
    
    // Check alert dialog opened
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.locator('text=Delete All Test History')).toBeVisible();
    await expect(page.locator('text=Type "DELETE" to confirm')).toBeVisible();
    
    // Check confirmation input
    const confirmInput = page.locator('input[placeholder="Type DELETE to confirm"]');
    await expect(confirmInput).toBeVisible();
    
    // Test that delete button is disabled without correct confirmation
    const deleteButton = page.getByRole('button', { name: /Delete All History/ }).last();
    await expect(deleteButton).toBeDisabled();
    
    // Type incorrect confirmation
    await confirmInput.fill('delete');
    await expect(deleteButton).toBeDisabled();
    
    // Type correct confirmation
    await confirmInput.fill('DELETE');
    await expect(deleteButton).not.toBeDisabled();
    
    // Cancel dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
  });

  test('should display analytics data correctly', async ({ page }) => {
    // Navigate to Analytics tab
    await page.getByRole('tab', { name: 'Analytics' }).click();
    
    // Check performance breakdown
    await expect(page.locator('text=98.5%')).toBeVisible(); // Best Accuracy
    await expect(page.locator('text=94.2%')).toBeVisible(); // Average Accuracy
    await expect(page.locator('text=2h 30m')).toBeVisible(); // Total time (150 minutes)
    await expect(page.locator('text=+12 WPM')).toBeVisible(); // Improvement trend
    
    // Check difficulty breakdown
    await expect(page.locator('text=8 tests')).toBeVisible(); // Easy tests
    await expect(page.locator('text=12 tests')).toBeVisible(); // Medium tests  
    await expect(page.locator('text=5 tests')).toBeVisible(); // Hard tests
  });

  test('should handle logout functionality', async ({ page }) => {
    await page.getByRole('button', { name: /Logout/ }).click();
    
    // Should navigate to home page after logout
    await expect(page).toHaveURL('/');
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that essential elements are still visible
    await expect(page.locator('text=testuser')).toBeVisible();
    await expect(page.getByRole('button', { name: /Edit Profile/ }).first()).toBeVisible();
    
    // Stats cards should stack properly on mobile
    const statsContainer = page.locator('[class*="grid-cols-2"]').first();
    await expect(statsContainer).toBeVisible();
    
    // Tabs should be responsive
    await expect(page.getByRole('tab', { name: 'Progress' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Test History' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Analytics' })).toBeVisible();
    
    // Left column should collapse properly on mobile
    await expect(page.locator('text=Defaults')).toBeVisible();
    await expect(page.getByRole('button', { name: /Export CSV/ })).toBeVisible();
  });

  test('should navigate back to home page', async ({ page }) => {
    await page.getByRole('button', { name: /TapTest/ }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Profile Page - Google User', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for Google user
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 1,
            username: 'googleuser',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            google_id: 'google123456',
            profile_picture: 'https://example.com/avatar.jpg'
          }
        })
      });
    });

    await page.route('**/api/tests/stats/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null })
      });
    });

    await page.route('**/api/tests?**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
        })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
    });

    await page.goto('/profile');
  });

  test('should not show change password button for Google users', async ({ page }) => {
    // Check that Google badge is shown
    await expect(page.locator('text=Google')).toBeVisible();
    
    // Change password button should not exist for Google users
    await expect(page.getByRole('button', { name: /Change Password/ })).not.toBeVisible();
    
    // Other buttons should still be visible
    await expect(page.getByRole('button', { name: /Edit Profile/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Logout/ })).toBeVisible();
  });

  test('should display profile picture for Google users', async ({ page }) => {
    // Check that profile picture is displayed
    const avatar = page.locator('img[alt="googleuser"]');
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });
});

test.describe('Profile Page - No Test Data', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses with no test data
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 1,
            username: 'newuser',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            google_id: null,
            profile_picture: null
          }
        })
      });
    });

    await page.route('**/api/tests/stats/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null })
      });
    });

    await page.route('**/api/tests?**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }
        })
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
    });

    await page.goto('/profile');
  });

  test('should show empty states when no test data', async ({ page }) => {
    // Navigate to Test History tab
    await page.getByRole('tab', { name: 'Test History' }).click();
    
    // Should show empty state
    await expect(page.locator('text=No tests taken yet')).toBeVisible();
    await expect(page.locator('text=Start typing to see your results here!')).toBeVisible();
    await expect(page.getByRole('button', { name: /Take Your First Test/ })).toBeVisible();
    
    // Export and Delete buttons should be disabled
    await expect(page.getByRole('button', { name: /Export CSV/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Delete All Test History/ })).toBeDisabled();
  });

  test('should show default stats when no user stats', async ({ page }) => {
    // Stats cards should show 0 values or "Never"
    await expect(page.locator('text=0').first()).toBeVisible(); // Best WPM should be 0
    await expect(page.locator('text=Never')).toBeVisible(); // Last test should be "Never"
  });
});