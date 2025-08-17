import { test, expect } from '@playwright/test';

test.describe('Profile Page Visual and Layout Audit', () => {
  
  // Helper to set up proper authentication for profile access
  const setupAuthenticatedSession = async (page: any) => {
    // First go to login page and perform actual authentication
    await page.goto('/login');
    
    // Fill in login form with demo credentials
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for authentication to complete
    await page.waitForTimeout(2000);
    
    // Mock API responses after authentication for consistent testing
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
            best_accuracy: 98.7,
            total_time_spent: 1800,
            improvement_trend: {
              wpm_change: 8.5,
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
                wpm: 95,
                cpm: 475,
                accuracy: 98.7,
                totalTime: 120,
                difficulty: 'hard',
                created_at: '2024-01-15T10:30:00.000Z'
              },
              {
                id: 2,
                wpm: 82,
                cpm: 410,
                accuracy: 97.2,
                totalTime: 60,
                difficulty: 'medium',
                created_at: '2024-01-14T15:45:00.000Z'
              },
              {
                id: 3,
                wpm: 68,
                cpm: 340,
                accuracy: 94.5,
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
  };

  test('should capture profile page layout in different screen sizes and analyze colors', async ({ page }) => {
    await setupAuthenticatedSession(page);
    
    try {
      // Navigate to profile page
      await page.goto('/profile');
      await page.waitForTimeout(3000);
      
      // Check if we successfully reached the profile page
      const currentUrl = await page.url();
      console.log('Current URL:', currentUrl);
      
      if (currentUrl.includes('/profile')) {
        console.log('✅ Successfully accessed profile page');
        
        // Test different screen sizes
        const viewports = [
          { width: 1920, height: 1080, name: 'desktop-large' },
          { width: 1280, height: 720, name: 'desktop-medium' },
          { width: 768, height: 1024, name: 'tablet' },
          { width: 375, height: 667, name: 'mobile' }
        ];

        for (const viewport of viewports) {
          console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
          
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.waitForTimeout(1000);

          // Take screenshot
          await page.screenshot({
            path: `tests/screenshots/profile-audit-${viewport.name}.png`,
            fullPage: true
          });

          // Check for horizontal overflow
          const hasHorizontalScroll = await page.evaluate(() => {
            return document.body.scrollWidth > document.body.clientWidth;
          });

          if (hasHorizontalScroll) {
            console.log(`❌ Horizontal overflow detected on ${viewport.name}`);
          } else {
            console.log(`✅ No horizontal overflow on ${viewport.name}`);
          }

          // Analyze colors used in the page
          const colorAnalysis = await page.evaluate(() => {
            const colorMap = new Map();
            const questionableColors = [];
            
            // Define approved green/teal color palette
            const approvedColors = new Set([
              'rgb(34, 197, 94)',   // primary green
              'rgb(52, 211, 153)',  // primary teal  
              'rgb(16, 185, 129)',  // emerald-500
              'rgb(5, 150, 105)',   // emerald-600
              'rgb(4, 120, 87)',    // emerald-700
              'rgb(6, 95, 70)',     // emerald-800
              'rgb(45, 212, 191)',  // teal variant
              // Neutral colors are also approved
              'rgb(255, 255, 255)', 'rgb(0, 0, 0)',
              'rgb(240, 248, 255)', 'rgb(15, 23, 42)',
              'rgb(30, 41, 59)', 'rgb(45, 55, 72)',
              'rgb(55, 65, 81)', 'rgb(75, 85, 99)',
              'rgb(107, 114, 128)', 'rgb(161, 161, 170)',
              'rgb(209, 213, 219)', 'rgb(229, 231, 235)',
              'rgb(243, 244, 246)', 'rgb(224, 242, 254)',
              'rgb(209, 250, 229)', 'rgb(239, 68, 68)' // destructive red
            ]);

            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
              const styles = window.getComputedStyle(el);
              
              [styles.color, styles.backgroundColor, styles.borderColor].forEach(color => {
                if (color && color !== 'rgba(0, 0, 0, 0)' && !color.includes('transparent')) {
                  colorMap.set(color, (colorMap.get(color) || 0) + 1);
                  
                  if (!approvedColors.has(color) && !color.includes('rgba(0, 0, 0, 0)')) {
                    questionableColors.push(color);
                  }
                }
              });
            });

            return {
              totalColors: colorMap.size,
              colorFrequency: Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
              questionableColors: [...new Set(questionableColors)].slice(0, 10)
            };
          });

          console.log(`🎨 Color analysis for ${viewport.name}:`);
          console.log(`   Total unique colors: ${colorAnalysis.totalColors}`);
          if (colorAnalysis.questionableColors.length > 0) {
            console.log(`   ⚠️  Non-approved colors found:`, colorAnalysis.questionableColors.slice(0, 5));
          }

          // Test both tabs if they exist
          const accountTab = page.locator('text=Account & Settings');
          const statsTab = page.locator('text=Stats & Progress');
          
          if (await accountTab.isVisible()) {
            await accountTab.click();
            await page.waitForTimeout(1000);
            await page.screenshot({
              path: `tests/screenshots/profile-account-tab-${viewport.name}.png`,
              fullPage: true
            });
          }
          
          if (await statsTab.isVisible()) {
            await statsTab.click();
            await page.waitForTimeout(1000);
            await page.screenshot({
              path: `tests/screenshots/profile-stats-tab-${viewport.name}.png`,
              fullPage: true
            });
          }
        }

        // Test dark mode
        await page.evaluate(() => {
          document.documentElement.classList.add('dark');
        });
        await page.waitForTimeout(1000);
        
        await page.screenshot({
          path: 'tests/screenshots/profile-dark-mode-audit.png',
          fullPage: true
        });

        console.log('🌙 Dark mode screenshot captured');

      } else {
        console.log('❌ Could not access profile page, taking screenshot of current state');
        await page.screenshot({
          path: 'tests/screenshots/profile-access-failure.png',
          fullPage: true
        });
      }
      
    } catch (error) {
      console.log('❌ Error during profile page testing:', error);
      await page.screenshot({
        path: 'tests/screenshots/profile-error-state.png',
        fullPage: true
      });
    }
  });

  test('should test profile page without authentication (redirect behavior)', async ({ page }) => {
    // Try to access profile without authentication
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    
    const currentUrl = await page.url();
    console.log('Redirect URL:', currentUrl);
    
    // Should redirect to login
    if (currentUrl.includes('/login')) {
      console.log('✅ Proper redirect to login page');
    } else {
      console.log('⚠️ Unexpected redirect behavior');
    }
    
    await page.screenshot({
      path: 'tests/screenshots/profile-unauthenticated-redirect.png',
      fullPage: true
    });
  });

  test('should analyze component-specific layout issues', async ({ page }) => {
    await setupAuthenticatedSession(page);
    
    try {
      await page.goto('/profile');
      await page.waitForTimeout(3000);
      
      if (await page.locator('text=testuser').isVisible()) {
        console.log('✅ Profile loaded successfully');
        
        // Analyze specific components for layout issues
        const layoutAnalysis = await page.evaluate(() => {
          const issues = [];
          
          // Check for elements that might be causing overflow
          const elements = document.querySelectorAll('*');
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            
            // Check for very wide elements
            if (rect.width > window.innerWidth + 50) {
              issues.push({
                type: 'wide-element',
                element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                width: rect.width,
                viewportWidth: window.innerWidth
              });
            }
            
            // Check for elements with fixed positioning that might cause issues
            if (styles.position === 'fixed' && rect.right > window.innerWidth) {
              issues.push({
                type: 'fixed-overflow',
                element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                rightEdge: rect.right
              });
            }
          });
          
          return issues.slice(0, 10); // Limit to top 10 issues
        });

        console.log('🔍 Layout analysis results:');
        if (layoutAnalysis.length === 0) {
          console.log('✅ No major layout issues detected');
        } else {
          console.log('⚠️ Layout issues found:');
          layoutAnalysis.forEach((issue, index) => {
            console.log(`  ${index + 1}. ${issue.type}: ${issue.element}`);
          });
        }
        
      }
    } catch (error) {
      console.log('Error in layout analysis:', error);
    }
  });
});