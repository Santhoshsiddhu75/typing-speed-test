import { test, expect } from '@playwright/test';

test.describe('Enhanced Profile Page', () => {
  const setupMocks = async (page: any, hasTests = true) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01T00:00:00.000Z',
        default_timer: 2,
        default_difficulty: 'medium'
      }));
    });

    await page.route('**/api/auth/me', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 1,
              username: 'testuser',
              created_at: '2024-01-01T00:00:00.000Z',
              default_timer: 2,
              default_difficulty: 'medium'
            }
          }
        })
      });
    });

    if (hasTests) {
      await page.route('**/api/tests/stats/testuser', async (route: any) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              username: 'testuser',
              total_tests: 25,
              average_wpm: 72.3,
              average_accuracy: 96.1,
              best_wpm: 95,
              best_accuracy: 99.2,
              total_time_spent: 1800,
              improvement_trend: {
                wpm_change: 8.5,
                accuracy_change: 2.3
              },
              difficulty_breakdown: {
                easy: 5,
                medium: 15,
                hard: 5
              }
            }
          })
        });
      });

      await page.route('**/api/tests?username=testuser*', async (route: any) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              data: [
                {
                  id: 1,
                  wpm: 85,
                  cpm: 425,
                  accuracy: 97.8,
                  totalTime: 120,
                  difficulty: 'hard',
                  created_at: '2024-01-15T14:30:00.000Z'
                },
                {
                  id: 2,
                  wpm: 78,
                  cpm: 390,
                  accuracy: 95.4,
                  totalTime: 60,
                  difficulty: 'medium',
                  created_at: '2024-01-14T10:15:00.000Z'
                }
              ],
              pagination: {
                total: 2,
                limit: 100,
                offset: 0,
                hasMore: false
              }
            }
          })
        });
      });
    } else {
      await page.route('**/api/tests/stats/testuser', async (route: any) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'No test results found for this user'
          })
        });
      });

      await page.route('**/api/tests?username=testuser*', async (route: any) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              data: [],
              pagination: { total: 0, limit: 100, offset: 0, hasMore: false }
            }
          })
        });
      });
    }
  };

  test('should display tabs interface correctly', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Check that both tabs are visible
    await expect(page.locator('text=Account & Settings')).toBeVisible();
    await expect(page.locator('text=Stats & Progress')).toBeVisible();
    
    // Check that Account tab is active by default
    await expect(page.locator('[data-state="active"]:has-text("Account & Settings")')).toBeVisible();
  });

  test('should switch between tabs correctly', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Start on Account tab, check for edit profile section
    await expect(page.locator('text=Profile Settings')).toBeVisible();
    
    // Switch to Stats tab
    await page.click('text=Stats & Progress');
    await page.waitForTimeout(500);
    
    // Check stats content is visible
    await expect(page.locator('text=Best WPM')).toBeVisible();
    await expect(page.locator('text=Progress Over Time')).toBeVisible();
    
    // Switch back to Account tab
    await page.click('text=Account & Settings');
    await page.waitForTimeout(500);
    
    // Check account content is visible again
    await expect(page.locator('text=Profile Settings')).toBeVisible();
  });

  test('should display profile information correctly', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Check header information
    await expect(page.locator('h1')).toContainText('testuser');
    await expect(page.locator('text=Member since')).toBeVisible();
    
    // Check profile settings section
    await expect(page.locator('text=testuser')).toBeVisible();
    await expect(page.locator('text=Local Account')).toBeVisible();
  });

  test('should open and close edit profile dialog', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Click Edit Profile button
    await page.click('text=Edit Profile');
    await page.waitForTimeout(500);

    // Check dialog is open
    await expect(page.locator('text=Update your profile information')).toBeVisible();
    await expect(page.locator('input[value="testuser"]')).toBeVisible();
    await expect(page.locator('text=2 minutes')).toBeVisible();
    await expect(page.locator('text=Medium')).toBeVisible();

    // Close dialog with Cancel
    await page.click('text=Cancel');
    await page.waitForTimeout(500);

    // Check dialog is closed
    await expect(page.locator('text=Update your profile information')).not.toBeVisible();
  });

  test('should handle profile update form submission', async ({ page }) => {
    await setupMocks(page);
    
    // Mock profile update API
    await page.route('**/api/users/1', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 1,
              username: 'updateduser',
              default_timer: 5,
              default_difficulty: 'hard'
            }
          }
        })
      });
    });

    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Open edit dialog
    await page.click('text=Edit Profile');
    await page.waitForTimeout(500);

    // Update username
    const usernameInput = page.locator('input[value="testuser"]');
    await usernameInput.clear();
    await usernameInput.fill('updateduser');

    // Update timer to 5 minutes
    await page.click('[data-testid="default-timer-select"] button');
    await page.waitForTimeout(300);
    await page.click('text=5 minutes');

    // Update difficulty to Hard
    await page.click('[data-testid="default-difficulty-select"] button');
    await page.waitForTimeout(300);
    await page.click('text=Hard');

    // Submit form
    await page.click('text=Save Changes');
    
    // Wait for potential page reload (as mentioned in the code)
    await page.waitForTimeout(2000);
  });

  test('should display password change dialog for local accounts', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Check that Change Password button is visible (not Google account)
    await expect(page.locator('text=Change Password')).toBeVisible();

    // Click Change Password
    await page.click('text=Change Password');
    await page.waitForTimeout(500);

    // Check password dialog elements
    await expect(page.locator('text=Update your account password')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter current password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter new password"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Confirm new password"]')).toBeVisible();

    // Check password visibility toggles
    await expect(page.locator('button:has(svg)')).toHaveCount({ min: 3 }); // Eye icons
  });

  test('should toggle password visibility in change password dialog', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    await page.click('text=Change Password');
    await page.waitForTimeout(500);

    const currentPasswordInput = page.locator('input[placeholder="Enter current password"]');
    const newPasswordInput = page.locator('input[placeholder="Enter new password"]');
    
    // Fill in passwords
    await currentPasswordInput.fill('currentpass123');
    await newPasswordInput.fill('newpass456');

    // Initially passwords should be hidden (type="password")
    await expect(currentPasswordInput).toHaveAttribute('type', 'password');
    await expect(newPasswordInput).toHaveAttribute('type', 'password');

    // Click first toggle (for current password)
    const toggleButtons = page.locator('button:has(svg)');
    await toggleButtons.first().click();
    await page.waitForTimeout(300);

    // Current password should now be visible (type="text")
    await expect(currentPasswordInput).toHaveAttribute('type', 'text');
  });

  test('should handle password change form submission', async ({ page }) => {
    await setupMocks(page);
    
    // Mock password change API
    await page.route('**/api/users/1/password', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Password updated successfully'
        })
      });
    });

    await page.goto('/profile');
    await page.waitForTimeout(1000);

    await page.click('text=Change Password');
    await page.waitForTimeout(500);

    // Fill password form
    await page.fill('input[placeholder="Enter current password"]', 'currentpass123');
    await page.fill('input[placeholder="Enter new password"]', 'newpass456');
    await page.fill('input[placeholder="Confirm new password"]', 'newpass456');

    // Submit form
    await page.click('text=Change Password >> nth=1'); // Second occurrence (button)
    await page.waitForTimeout(1000);

    // Dialog should close on success
    await expect(page.locator('text=Update your account password')).not.toBeVisible();
  });

  test('should display data management section', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Check Data Management section
    await expect(page.locator('text=Data Management')).toBeVisible();
    await expect(page.locator('text=Export Test History (CSV)')).toBeVisible();
    await expect(page.locator('text=Delete All Test History')).toBeVisible();
  });

  test('should handle CSV export functionality', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    const exportButton = page.locator('text=Export Test History (CSV)');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();

    // Set up download expectation
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/typing-test-history-testuser-\d{4}-\d{2}-\d{2}\.csv/);
  });

  test('should display delete confirmation dialog', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Click Delete All Test History
    await page.click('text=Delete All Test History');
    await page.waitForTimeout(500);

    // Check confirmation dialog
    await expect(page.locator('text=Delete All Test History >> nth=1')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();
    await expect(page.locator('text=permanently delete all your typing test results')).toBeVisible();

    // Check dialog buttons
    await expect(page.locator('text=Cancel')).toBeVisible();
    await expect(page.locator('text=Delete All History')).toBeVisible();
  });

  test('should handle delete all history confirmation', async ({ page }) => {
    await setupMocks(page);
    
    // Mock delete API
    await page.route('**/api/tests?username=testuser', async (route: any) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'All test history deleted successfully'
          })
        });
      }
    });

    await page.goto('/profile');
    await page.waitForTimeout(1000);

    await page.click('text=Delete All Test History');
    await page.waitForTimeout(500);

    // Confirm deletion
    await page.click('text=Delete All History');
    await page.waitForTimeout(1000);

    // Dialog should close and data should be cleared
    await expect(page.locator('text=This action cannot be undone')).not.toBeVisible();
  });

  test('should display logout functionality', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Check logout button is visible
    const logoutButton = page.locator('text=Logout');
    await expect(logoutButton).toBeVisible();
    
    // Click logout (will navigate away)
    await logoutButton.click();
    await page.waitForTimeout(1000);
    
    // Should redirect to homepage
    await expect(page).toHaveURL('/');
  });

  test('should display enhanced stats section', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Switch to Stats tab
    await page.click('text=Stats & Progress');
    await page.waitForTimeout(1000);

    // Check all stats cards
    await expect(page.locator('text=Best WPM')).toBeVisible();
    await expect(page.locator('text=95')).toBeVisible(); // Best WPM value
    await expect(page.locator('text=Best Accuracy')).toBeVisible();
    await expect(page.locator('text=99.2%')).toBeVisible(); // Best accuracy value
    await expect(page.locator('text=Tests Completed')).toBeVisible();
    await expect(page.locator('text=25')).toBeVisible(); // Total tests
    await expect(page.locator('text=Favorite Difficulty')).toBeVisible();

    // Check progress chart
    await expect(page.locator('text=Progress Over Time')).toBeVisible();
    await expect(page.locator('text=Your WPM and accuracy progression')).toBeVisible();

    // Check time filter
    await expect(page.locator('text=All time')).toBeVisible();

    // Check test history
    await expect(page.locator('text=Test History')).toBeVisible();
    await expect(page.locator('text=Your recent typing test results')).toBeVisible();
  });

  test('should handle no tests state correctly', async ({ page }) => {
    await setupMocks(page, false); // No tests
    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Switch to Stats tab
    await page.click('text=Stats & Progress');
    await page.waitForTimeout(1000);

    // Should show no tests state
    await expect(page.locator('text=No Test Results Yet')).toBeVisible();
    await expect(page.locator('text=Start taking typing tests')).toBeVisible();
    await expect(page.locator('text=Take Your First Test')).toBeVisible();

    // Export and delete buttons should be disabled
    await page.click('text=Account & Settings');
    await page.waitForTimeout(500);
    
    const exportButton = page.locator('text=Export Test History (CSV)');
    const deleteButton = page.locator('text=Delete All Test History');
    
    await expect(exportButton).toBeDisabled();
    await expect(deleteButton).toBeDisabled();
  });

  test('complete profile workflow: login → profile → edit → change password → export → delete', async ({ page }) => {
    // This test implements the comprehensive workflow requested
    await setupMocks(page);
    
    // Mock all required APIs
    await page.route('**/api/users/1', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 1, username: 'newusername' } }
        })
      });
    });

    await page.route('**/api/users/1/password', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/tests?username=testuser', async (route: any) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    // Step 1: Navigate to profile (already authenticated via mocks)
    await page.goto('/profile');
    await page.waitForTimeout(1000);
    await expect(page.locator('h1')).toContainText('testuser');

    // Step 2: Edit username
    await page.click('text=Edit Profile');
    await page.waitForTimeout(500);
    const usernameInput = page.locator('input[value="testuser"]');
    await usernameInput.clear();
    await usernameInput.fill('newusername');
    await page.click('text=Save Changes');
    await page.waitForTimeout(1000);

    // Step 3: Change password
    await page.click('text=Change Password');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="Enter current password"]', 'oldpass123');
    await page.fill('input[placeholder="Enter new password"]', 'newpass456');
    await page.fill('input[placeholder="Confirm new password"]', 'newpass456');
    await page.click('text=Change Password >> nth=1');
    await page.waitForTimeout(1000);

    // Step 4: Export CSV
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export Test History (CSV)');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');

    // Step 5: Delete all history
    await page.click('text=Delete All Test History');
    await page.waitForTimeout(500);
    await page.click('text=Delete All History');
    await page.waitForTimeout(1000);

    // Step 6: Verify empty list (switch to stats to check)
    await page.click('text=Stats & Progress');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=No Test Results Yet')).toBeVisible();
  });
});