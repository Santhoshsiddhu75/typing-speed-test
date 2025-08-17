import { test, expect } from '@playwright/test';

test.describe('Profile Page - Enhanced Layout', () => {
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
            improvement_trend: {
              wpm_change: 12,
              accuracy_change: 2.3
            },
            difficulty_breakdown: {
              easy: 8,
              medium: 12,
              hard: 5
            }
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
                id: 1,
                wpm: 75,
                cpm: 375,
                accuracy: 96.2,
                totalTime: 120,
                difficulty: 'medium',
                created_at: '2024-01-15T14:30:00Z',
                username: 'testuser'
              },
              {
                id: 2,
                wpm: 82,
                cpm: 410,
                accuracy: 94.8,
                totalTime: 120,
                difficulty: 'hard',
                created_at: '2024-01-14T10:15:00Z',
                username: 'testuser'
              },
              {
                id: 3,
                wpm: 69,
                cpm: 345,
                accuracy: 97.1,
                totalTime: 60,
                difficulty: 'easy',
                created_at: '2024-01-13T16:45:00Z',
                username: 'testuser'
              }
            ],
            pagination: {
              total: 25,
              limit: 10,
              offset: 0,
              hasMore: true
            }
          }
        })
      });
    });

    // Set up authentication token
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
    });

    await page.goto('/profile');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear auth and go directly to profile
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('should display new layout with header and cards', async ({ page }) => {
    // Check header elements
    await expect(page.locator('text=TapTest')).toBeVisible();
    await expect(page.getByTestId('theme-toggle')).toBeVisible();
    
    // Check left column account card
    await expect(page.locator('text=testuser')).toBeVisible();
    await expect(page.locator('text=Password')).toBeVisible(); // Auth method badge
    
    // Check action buttons in left column
    await expect(page.getByRole('button', { name: /Edit Profile/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Change Password/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Logout/ })).toBeVisible();
    
    // Check defaults section
    await expect(page.locator('text=Defaults')).toBeVisible();
    await expect(page.getByRole('button', { name: /1m/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /2m/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /5m/ })).toBeVisible();
    
    // Check data management buttons
    await expect(page.getByRole('button', { name: /Export CSV/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Delete All Test History/ })).toBeVisible();
  });

  test('should display enhanced stats cards with gradients', async ({ page }) => {
    // Check for new gradient stats cards in right column
    await expect(page.locator('text=Best WPM')).toBeVisible();
    await expect(page.locator('text=89')).toBeVisible(); // Best WPM value from mock
    
    await expect(page.locator('text=Average WPM')).toBeVisible();
    await expect(page.locator('text=69')).toBeVisible(); // Rounded average WPM
    
    await expect(page.locator('text=Tests')).toBeVisible();
    await expect(page.locator('text=25')).toBeVisible(); // Total tests
    
    await expect(page.locator('text=Last Test')).toBeVisible();
    await expect(page.locator('text=Jan 15')).toBeVisible(); // Last test date
    
    // Check that trend indicators are displayed
    await expect(page.locator('text=+5%')).toBeVisible(); // Best WPM trend
    await expect(page.locator('text=+2%')).toBeVisible(); // Average WPM trend
  });

  test('should display progress chart', async ({ page }) => {
    // Mock authentication and API responses (same as above)
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01T00:00:00.000Z'
      }));
    });

    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 1,
              username: 'testuser',
              created_at: '2024-01-01T00:00:00.000Z'
            }
          }
        })
      });
    });

    await page.route('**/api/tests/stats/testuser', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            username: 'testuser',
            total_tests: 50,
            average_wpm: 65.5,
            average_accuracy: 94.2,
            best_wpm: 85,
            best_accuracy: 98.5,
            total_time_spent: 3600,
            improvement_trend: { wpm_change: 5.2, accuracy_change: 1.8 },
            difficulty_breakdown: { easy: 15, medium: 25, hard: 10 }
          }
        })
      });
    });

    await page.route('**/api/tests?username=testuser*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            data: [
              {
                id: 1,
                wpm: 75,
                cpm: 375,
                accuracy: 95.5,
                totalTime: 60,
                difficulty: 'medium',
                created_at: '2024-01-15T10:30:00.000Z'
              },
              {
                id: 2,
                wpm: 68,
                cpm: 340,
                accuracy: 92.3,
                totalTime: 120,
                difficulty: 'hard',
                created_at: '2024-01-14T15:45:00.000Z'
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

    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Check for progress chart section
    await expect(page.locator('text=Progress Over Time')).toBeVisible();
    await expect(page.locator('text=Your WPM and accuracy progression')).toBeVisible();
    
    // Check if chart container is present (Recharts creates SVG elements)
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
  });

  test('should display tests table and allow filtering', async ({ page }) => {
    // Mock authentication and API responses (same as above)
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01T00:00:00.000Z'
      }));
    });

    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 1,
              username: 'testuser',
              created_at: '2024-01-01T00:00:00.000Z'
            }
          }
        })
      });
    });

    await page.route('**/api/tests/stats/testuser', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            username: 'testuser',
            total_tests: 3,
            average_wpm: 65.5,
            average_accuracy: 94.2,
            best_wpm: 85,
            best_accuracy: 98.5,
            total_time_spent: 240,
            improvement_trend: { wpm_change: 5.2, accuracy_change: 1.8 },
            difficulty_breakdown: { easy: 1, medium: 1, hard: 1 }
          }
        })
      });
    });

    await page.route('**/api/tests?username=testuser*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            data: [
              {
                id: 1,
                wpm: 75,
                cpm: 375,
                accuracy: 95.5,
                totalTime: 60,
                difficulty: 'medium',
                created_at: '2024-01-15T10:30:00.000Z'
              },
              {
                id: 2,
                wpm: 68,
                cpm: 340,
                accuracy: 92.3,
                totalTime: 120,
                difficulty: 'hard',
                created_at: '2024-01-14T15:45:00.000Z'
              },
              {
                id: 3,
                wpm: 55,
                cpm: 275,
                accuracy: 89.1,
                totalTime: 60,
                difficulty: 'easy',
                created_at: '2024-01-13T09:15:00.000Z'
              }
            ],
            pagination: {
              total: 3,
              limit: 100,
              offset: 0,
              hasMore: false
            }
          }
        })
      });
    });

    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Check for test history section
    await expect(page.locator('text=Test History')).toBeVisible();
    
    // Check that test data is displayed
    await expect(page.locator('text=75')).toBeVisible(); // WPM from first test
    await expect(page.locator('text=95.5%')).toBeVisible(); // Accuracy from first test
    await expect(page.locator('text=medium')).toBeVisible(); // Difficulty badge
    
    // Test filtering
    await page.click('[data-testid="difficulty-filter"] button');
    await page.waitForTimeout(500);
    await page.click('text=Easy');
    await page.waitForTimeout(1000);
    
    // After filtering, only easy tests should be visible
    await expect(page.locator('text=55')).toBeVisible(); // WPM from easy test
    await expect(page.locator('text=easy')).toBeVisible(); // Easy badge
    
    // Medium test should not be visible
    await expect(page.locator('text=75')).not.toBeVisible();
  });

  test('should allow CSV export', async ({ page }) => {
    // Mock authentication and API responses (same as above)
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01T00:00:00.000Z'
      }));
    });

    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 1,
              username: 'testuser',
              created_at: '2024-01-01T00:00:00.000Z'
            }
          }
        })
      });
    });

    await page.route('**/api/tests/stats/testuser', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            username: 'testuser',
            total_tests: 1,
            average_wpm: 75,
            average_accuracy: 95.5,
            best_wpm: 75,
            best_accuracy: 95.5,
            total_time_spent: 60,
            improvement_trend: { wpm_change: 0, accuracy_change: 0 },
            difficulty_breakdown: { easy: 0, medium: 1, hard: 0 }
          }
        })
      });
    });

    await page.route('**/api/tests?username=testuser*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            data: [
              {
                id: 1,
                wpm: 75,
                cpm: 375,
                accuracy: 95.5,
                totalTime: 60,
                difficulty: 'medium',
                created_at: '2024-01-15T10:30:00.000Z'
              }
            ],
            pagination: {
              total: 1,
              limit: 100,
              offset: 0,
              hasMore: false
            }
          }
        })
      });
    });

    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Check that export button is present and enabled
    const exportButton = page.locator('text=Export CSV');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();

    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/typing-test-history-testuser-\d{4}-\d{2}-\d{2}\.csv/);
  });

  test('should show back to test button', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01T00:00:00.000Z'
      }));
    });

    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 1,
              username: 'testuser',
              created_at: '2024-01-01T00:00:00.000Z'
            }
          }
        })
      });
    });

    // Mock empty responses for stats and tests
    await page.route('**/api/tests/stats/testuser', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'No test results found for this user'
        })
      });
    });

    await page.route('**/api/tests?username=testuser*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            data: [],
            pagination: {
              total: 0,
              limit: 100,
              offset: 0,
              hasMore: false
            }
          }
        })
      });
    });

    await page.goto('/profile');
    await page.waitForTimeout(1000);

    // Check for back button
    const backButton = page.locator('text=Back to Test');
    await expect(backButton).toBeVisible();
  });
});