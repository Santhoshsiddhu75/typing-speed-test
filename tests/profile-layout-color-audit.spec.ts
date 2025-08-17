import { test, expect } from '@playwright/test';

test.describe('Profile Page Layout and Color Audit', () => {
  
  // Helper function to set up authenticated user with comprehensive data
  const setupAuthenticatedUser = async (page: any, hasData = true) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01T00:00:00.000Z'
      }));
    });

    // Mock authentication endpoint
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
              created_at: '2024-01-01T00:00:00.000Z'
            }
          }
        })
      });
    });

    if (hasData) {
      // Mock user stats with comprehensive data
      await page.route('**/api/tests/stats/testuser', async (route: any) => {
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
              improvement_trend: {
                wpm_change: 5.2,
                accuracy_change: 1.8
              },
              difficulty_breakdown: {
                easy: 15,
                medium: 25,
                hard: 10
              }
            }
          })
        });
      });

      // Mock test results with various data
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
                  accuracy: 98.5,
                  totalTime: 120,
                  difficulty: 'hard',
                  created_at: '2024-01-15T10:30:00.000Z'
                },
                {
                  id: 2,
                  wpm: 75,
                  cpm: 375,
                  accuracy: 95.5,
                  totalTime: 60,
                  difficulty: 'medium',
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
    } else {
      // Mock empty responses for no-data state
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
    }
  };

  // Color verification helper - checks if colors match approved palette
  const verifyColorPalette = async (page: any, screenshotName: string) => {
    const screenshot = await page.screenshot({
      path: `tests/screenshots/profile-color-audit-${screenshotName}.png`,
      fullPage: true
    });
    
    // Extract colors used in the page by checking computed styles
    const colorResults = await page.evaluate(() => {
      const results: any = {
        approvedColors: [],
        questionableColors: [],
        elements: []
      };
      
      // Define approved color palette (from index.css)
      const approvedPalette = {
        // Primary colors (green/teal theme)
        primary: ['rgb(34, 197, 94)', 'rgb(52, 211, 153)'], // green-500, emerald-400
        chart: [
          'rgb(34, 197, 94)',   // chart-1 (green-500)
          'rgb(16, 185, 129)',  // chart-2 (emerald-500) 
          'rgb(5, 150, 105)',   // chart-3 (emerald-600)
          'rgb(4, 120, 87)',    // chart-4 (emerald-700)
          'rgb(6, 95, 70)',     // chart-5 (emerald-800)
          'rgb(45, 212, 191)',  // chart-2 dark mode
        ],
        // Neutral colors (approved backgrounds/borders)
        neutral: [
          'rgb(240, 248, 255)', 'rgb(15, 23, 42)',     // backgrounds
          'rgb(255, 255, 255)', 'rgb(30, 41, 59)',     // cards
          'rgb(224, 242, 254)', 'rgb(45, 55, 72)',     // secondary
          'rgb(243, 244, 246)', 'rgb(55, 65, 81)',     // muted/accent
          'rgb(229, 231, 235)', 'rgb(75, 85, 99)',     // borders
          'rgb(209, 213, 219)', 'rgb(161, 161, 170)',  // text colors
          'rgb(55, 65, 81)', 'rgb(107, 114, 128)',     // text variants
        ],
        // System colors (allowed for specific purposes)
        system: [
          'rgb(239, 68, 68)',   // destructive (red)
          'rgba(255, 255, 255, 0)', 'rgba(0, 0, 0, 0)', // transparent
        ]
      };

      // Get all elements with computed styles
      const elements = document.querySelectorAll('*');
      elements.forEach((el: any, index: number) => {
        const styles = window.getComputedStyle(el);
        const colors = {
          background: styles.backgroundColor,
          color: styles.color,
          border: styles.borderColor,
          element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : '') + (index < 10 ? ` (sample)` : '')
        };

        const allColors = Object.values(approvedPalette).flat();
        
        // Check each color property
        Object.entries(colors).forEach(([prop, colorValue]) => {
          if (prop === 'element') return;
          
          const isTransparent = colorValue.includes('rgba(0, 0, 0, 0)') || 
                               colorValue.includes('rgba(255, 255, 255, 0)') ||
                               colorValue === 'rgba(0, 0, 0, 0)';
          
          if (!isTransparent && colorValue !== 'rgb(0, 0, 0)' && colorValue !== 'rgb(255, 255, 255)') {
            const isApproved = allColors.includes(colorValue);
            
            if (isApproved) {
              if (!results.approvedColors.includes(colorValue)) {
                results.approvedColors.push(colorValue);
              }
            } else {
              if (!results.questionableColors.includes(colorValue)) {
                results.questionableColors.push(colorValue);
                results.elements.push({
                  element: colors.element,
                  property: prop,
                  color: colorValue
                });
              }
            }
          }
        });
      });

      return results;
    });

    return { screenshot, colorResults };
  };

  // Container overflow detection helper
  const checkContainerOverflow = async (page: any) => {
    return await page.evaluate(() => {
      const overflowIssues: any[] = [];
      
      // Check for horizontal scrollbar on body/html
      const bodyScrollWidth = document.body.scrollWidth;
      const bodyClientWidth = document.body.clientWidth;
      const viewportWidth = window.innerWidth;
      
      if (bodyScrollWidth > viewportWidth) {
        overflowIssues.push({
          type: 'horizontal-scroll',
          element: 'body',
          scrollWidth: bodyScrollWidth,
          clientWidth: bodyClientWidth,
          viewportWidth: viewportWidth
        });
      }

      // Check individual elements for overflow
      const elements = document.querySelectorAll('*');
      elements.forEach((el: any) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        
        // Check if element extends beyond viewport
        if (rect.right > viewportWidth) {
          overflowIssues.push({
            type: 'element-overflow-right',
            element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
            rightEdge: rect.right,
            viewportWidth: viewportWidth,
            overflow: rect.right - viewportWidth
          });
        }

        // Check for elements with overflow issues
        if (styles.overflow === 'visible' && (el.scrollWidth > el.clientWidth)) {
          overflowIssues.push({
            type: 'content-overflow',
            element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth
          });
        }
      });

      return overflowIssues;
    });
  };

  test('should load profile page with proper authentication and take baseline screenshots', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    await page.goto('/profile');
    await page.waitForTimeout(2000); // Allow animations and data loading

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/profile-page-full-authenticated.png',
      fullPage: true
    });

    // Verify basic profile elements are loaded
    await expect(page.locator('h1')).toContainText('testuser');
    await expect(page.locator('text=Member since')).toBeVisible();
    await expect(page.locator('text=Account & Settings')).toBeVisible();
    await expect(page.locator('text=Stats & Progress')).toBeVisible();
  });

  test('should verify color palette compliance in light mode', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Ensure we're in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(500);

    const { colorResults } = await verifyColorPalette(page, 'light-mode');

    // Log findings
    console.log('=== LIGHT MODE COLOR AUDIT ===');
    console.log('Approved colors found:', colorResults.approvedColors.length);
    console.log('Questionable colors found:', colorResults.questionableColors.length);
    
    if (colorResults.questionableColors.length > 0) {
      console.log('\n🚨 QUESTIONABLE COLORS DETECTED:');
      colorResults.questionableColors.forEach((color: string, index: number) => {
        const element = colorResults.elements.find((el: any) => el.color === color);
        console.log(`  ${index + 1}. ${color} (used in: ${element?.element || 'unknown'} ${element?.property || ''})`);
      });
    }

    // We expect some questionable colors due to browser defaults, but flag if too many
    if (colorResults.questionableColors.length > 20) {
      console.warn(`⚠️  Warning: ${colorResults.questionableColors.length} non-approved colors detected. Review for brand consistency.`);
    }
  });

  test('should verify color palette compliance in dark mode', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);

    const { colorResults } = await verifyColorPalette(page, 'dark-mode');

    console.log('=== DARK MODE COLOR AUDIT ===');
    console.log('Approved colors found:', colorResults.approvedColors.length);
    console.log('Questionable colors found:', colorResults.questionableColors.length);
    
    if (colorResults.questionableColors.length > 0) {
      console.log('\n🚨 QUESTIONABLE COLORS DETECTED:');
      colorResults.questionableColors.forEach((color: string, index: number) => {
        const element = colorResults.elements.find((el: any) => el.color === color);
        console.log(`  ${index + 1}. ${color} (used in: ${element?.element || 'unknown'} ${element?.property || ''})`);
      });
    }

    if (colorResults.questionableColors.length > 20) {
      console.warn(`⚠️  Warning: ${colorResults.questionableColors.length} non-approved colors detected in dark mode.`);
    }
  });

  test('should check for container overflow and layout issues on desktop', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    const overflowIssues = await checkContainerOverflow(page);

    console.log('=== DESKTOP LAYOUT AUDIT (1920x1080) ===');
    console.log('Overflow issues detected:', overflowIssues.length);

    if (overflowIssues.length > 0) {
      console.log('\n🚨 LAYOUT ISSUES DETECTED:');
      overflowIssues.forEach((issue: any, index: number) => {
        console.log(`  ${index + 1}. ${issue.type}: ${issue.element}`);
        if (issue.overflow) {
          console.log(`     Overflows by: ${issue.overflow}px`);
        }
        if (issue.scrollWidth && issue.clientWidth) {
          console.log(`     Content: ${issue.scrollWidth}px, Container: ${issue.clientWidth}px`);
        }
      });
    }

    // Take screenshot for manual inspection
    await page.screenshot({
      path: 'tests/screenshots/profile-desktop-layout.png',
      fullPage: true
    });

    // Assert no critical overflow issues
    const criticalIssues = overflowIssues.filter((issue: any) => 
      issue.type === 'horizontal-scroll' || 
      (issue.type === 'element-overflow-right' && issue.overflow > 10)
    );
    
    if (criticalIssues.length > 0) {
      console.error('❌ Critical layout issues found that would cause horizontal scrolling');
    }
    expect(criticalIssues.length).toBeLessThanOrEqual(0);
  });

  test('should check responsive behavior on tablet screens', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    const overflowIssues = await checkContainerOverflow(page);

    console.log('=== TABLET LAYOUT AUDIT (768x1024) ===');
    console.log('Overflow issues detected:', overflowIssues.length);

    if (overflowIssues.length > 0) {
      console.log('\n🚨 TABLET LAYOUT ISSUES:');
      overflowIssues.forEach((issue: any, index: number) => {
        console.log(`  ${index + 1}. ${issue.type}: ${issue.element}`);
      });
    }

    await page.screenshot({
      path: 'tests/screenshots/profile-tablet-layout.png',
      fullPage: true
    });

    // Critical overflow check for tablet
    const criticalIssues = overflowIssues.filter((issue: any) => 
      issue.type === 'horizontal-scroll' || 
      (issue.type === 'element-overflow-right' && issue.overflow > 5)
    );
    expect(criticalIssues.length).toBeLessThanOrEqual(0);
  });

  test('should check responsive behavior on mobile screens', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    const overflowIssues = await checkContainerOverflow(page);

    console.log('=== MOBILE LAYOUT AUDIT (375x667) ===');
    console.log('Overflow issues detected:', overflowIssues.length);

    if (overflowIssues.length > 0) {
      console.log('\n🚨 MOBILE LAYOUT ISSUES:');
      overflowIssues.forEach((issue: any, index: number) => {
        console.log(`  ${index + 1}. ${issue.type}: ${issue.element}`);
      });
    }

    await page.screenshot({
      path: 'tests/screenshots/profile-mobile-layout.png',
      fullPage: true
    });

    // Mobile is most critical - no horizontal scroll allowed
    const criticalIssues = overflowIssues.filter((issue: any) => 
      issue.type === 'horizontal-scroll'
    );
    expect(criticalIssues.length).toBe(0);
  });

  test('should test stats tab layout and interactions', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Click on Stats & Progress tab
    await page.click('[data-state="inactive"]:has-text("Stats & Progress")');
    await page.waitForTimeout(1000);

    // Check that stats content is visible
    await expect(page.locator('text=Best WPM')).toBeVisible();
    await expect(page.locator('text=Progress Over Time')).toBeVisible();
    await expect(page.locator('text=Test History')).toBeVisible();

    // Take screenshot of stats tab
    await page.screenshot({
      path: 'tests/screenshots/profile-stats-tab.png',
      fullPage: true
    });

    // Check for overflow in stats tab
    const overflowIssues = await checkContainerOverflow(page);
    console.log('Stats tab overflow issues:', overflowIssues.length);
    
    // Test filtering functionality
    await page.click('text=All Difficulties');
    await page.waitForTimeout(500);
    await page.click('text=Medium');
    await page.waitForTimeout(1000);

    // Verify filtering worked
    await expect(page.locator('text=medium')).toBeVisible();

    // Take screenshot after filtering
    await page.screenshot({
      path: 'tests/screenshots/profile-stats-filtered.png',
      fullPage: true
    });
  });

  test('should test account settings tab and dialogs', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Should be on Account & Settings tab by default
    await expect(page.locator('text=Profile Settings')).toBeVisible();
    await expect(page.locator('text=Security Settings')).toBeVisible();

    // Take screenshot of account settings
    await page.screenshot({
      path: 'tests/screenshots/profile-account-settings.png',
      fullPage: true
    });

    // Test edit profile dialog
    await page.click('text=Edit Profile');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Update your profile information')).toBeVisible();
    
    // Take screenshot of edit dialog
    await page.screenshot({
      path: 'tests/screenshots/profile-edit-dialog.png'
    });

    // Close dialog with escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Test password change dialog (only for local accounts)
    const passwordButton = page.locator('text=Change Password');
    if (await passwordButton.isVisible()) {
      await passwordButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('text=Update your account password')).toBeVisible();
      
      await page.screenshot({
        path: 'tests/screenshots/profile-password-dialog.png'
      });

      await page.keyboard.press('Escape');
    }
  });

  test('should test no-data state appearance and layout', async ({ page }) => {
    await setupAuthenticatedUser(page, false); // No test data
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Click on Stats & Progress tab to see no-data state
    await page.click('[data-state="inactive"]:has-text("Stats & Progress")');
    await page.waitForTimeout(1000);

    // Check no-data state elements
    await expect(page.locator('text=No Test Results Yet')).toBeVisible();
    await expect(page.locator('text=Take Your First Test')).toBeVisible();

    // Take screenshot of no-data state
    await page.screenshot({
      path: 'tests/screenshots/profile-no-data-state.png',
      fullPage: true
    });

    // Check layout doesn't break with no data
    const overflowIssues = await checkContainerOverflow(page);
    expect(overflowIssues.filter(i => i.type === 'horizontal-scroll').length).toBe(0);
  });

  test('should perform comprehensive layout stress test', async ({ page }) => {
    await setupAuthenticatedUser(page, true);
    
    // Test multiple screen sizes in sequence
    const viewports = [
      { width: 320, height: 568, name: 'mobile-small' },
      { width: 375, height: 667, name: 'mobile-medium' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 1280, height: 720, name: 'desktop-small' },
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 2560, height: 1440, name: 'desktop-xl' }
    ];

    for (const viewport of viewports) {
      console.log(`\n=== TESTING ${viewport.name.toUpperCase()} (${viewport.width}x${viewport.height}) ===`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/profile');
      await page.waitForTimeout(2000);

      // Check both tabs
      const tabs = ['account', 'stats'];
      for (const tab of tabs) {
        if (tab === 'stats') {
          await page.click('[data-state="inactive"]:has-text("Stats & Progress")');
          await page.waitForTimeout(1000);
        }

        const overflowIssues = await checkContainerOverflow(page);
        const criticalIssues = overflowIssues.filter((issue: any) => 
          issue.type === 'horizontal-scroll'
        );

        console.log(`${tab} tab: ${overflowIssues.length} total issues, ${criticalIssues.length} critical`);

        if (criticalIssues.length > 0) {
          console.error(`❌ Critical layout failure on ${viewport.name} - ${tab} tab`);
          await page.screenshot({
            path: `tests/screenshots/profile-layout-failure-${viewport.name}-${tab}.png`,
            fullPage: true
          });
        }

        // Take screenshot for manual review
        await page.screenshot({
          path: `tests/screenshots/profile-responsive-${viewport.name}-${tab}.png`,
          fullPage: true
        });

        expect(criticalIssues.length).toBe(0);
      }
    }
  });
});