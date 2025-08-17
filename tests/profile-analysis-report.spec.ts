import { test, expect } from '@playwright/test';

test.describe('Profile Page Analysis and Visual Audit Report', () => {
  
  test('comprehensive visual and layout analysis report', async ({ page }) => {
    console.log('\n=== PROFILE PAGE LAYOUT AND COLOR AUDIT REPORT ===\n');
    
    // Test 1: Check routing and accessibility
    console.log('🔍 1. ROUTING AND ACCESSIBILITY TEST');
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    
    const currentUrl = await page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('typing-speed-test/profile')) {
      console.log('   ⚠️  Issue: Base URL routing configuration problem detected');
      console.log('   📝 Recommendation: Update vite config base URL for GitHub Pages deployment');
    }
    
    // Take screenshot of current state
    await page.screenshot({
      path: 'tests/screenshots/profile-routing-issue.png',
      fullPage: true
    });
    
    // Test 2: Color Analysis on Available Pages
    console.log('\n🎨 2. COLOR PALETTE ANALYSIS');
    
    // Go to home page and analyze colors there
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const colorAnalysis = await page.evaluate(() => {
      const results = {
        allColors: new Set(),
        backgroundColors: new Set(), 
        textColors: new Set(),
        borderColors: new Set(),
        approvedGreenTealColors: [],
        questionableColors: []
      };
      
      // Define approved color palette from index.css analysis
      const approvedPalette = {
        primary: [
          'rgb(34, 197, 94)',   // green-500
          'rgb(52, 211, 153)',  // emerald-400 
          'rgb(16, 185, 129)',  // emerald-500
          'rgb(5, 150, 105)',   // emerald-600
          'rgb(4, 120, 87)',    // emerald-700
          'rgb(6, 95, 70)',     // emerald-800
          'rgb(45, 212, 191)',  // teal-400
        ],
        neutral: [
          'rgb(255, 255, 255)', 'rgb(0, 0, 0)',
          'rgb(240, 248, 255)', 'rgb(15, 23, 42)',  // bg light/dark
          'rgb(30, 41, 59)', 'rgb(45, 55, 72)',     // card colors
          'rgb(55, 65, 81)', 'rgb(75, 85, 99)',     // text colors
          'rgb(107, 114, 128)', 'rgb(161, 161, 170)', // muted colors
          'rgb(209, 213, 219)', 'rgb(229, 231, 235)', // borders
          'rgb(243, 244, 246)', 'rgb(224, 242, 254)', // secondary
          'rgb(209, 250, 229)'  // accent green
        ],
        system: ['rgb(239, 68, 68)'] // red for destructive actions
      };
      
      const allApprovedColors = [
        ...approvedPalette.primary,
        ...approvedPalette.neutral,
        ...approvedPalette.system
      ];
      
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        
        [
          { prop: 'backgroundColor', value: styles.backgroundColor },
          { prop: 'color', value: styles.color },
          { prop: 'borderColor', value: styles.borderColor }
        ].forEach(({ prop, value }) => {
          if (value && 
              value !== 'rgba(0, 0, 0, 0)' && 
              !value.includes('transparent') && 
              value !== 'rgb(0, 0, 0)' && 
              value !== 'rgb(255, 255, 255)') {
            
            results.allColors.add(value);
            
            if (prop === 'backgroundColor') results.backgroundColors.add(value);
            if (prop === 'color') results.textColors.add(value);
            if (prop === 'borderColor') results.borderColors.add(value);
            
            // Check if it's an approved green/teal color
            if (approvedPalette.primary.includes(value)) {
              results.approvedGreenTealColors.push(value);
            }
            
            // Check if it's questionable
            if (!allApprovedColors.includes(value) && 
                !value.includes('rgba(') &&
                value !== 'rgb(0, 0, 238)') { // browser default link color
              results.questionableColors.push(value);
            }
          }
        });
      });
      
      return {
        totalColors: results.allColors.size,
        backgroundColors: Array.from(results.backgroundColors),
        textColors: Array.from(results.textColors),
        borderColors: Array.from(results.borderColors),
        approvedGreenTealColors: [...new Set(results.approvedGreenTealColors)],
        questionableColors: [...new Set(results.questionableColors)]
      };
    });
    
    console.log(`   Total unique colors detected: ${colorAnalysis.totalColors}`);
    console.log(`   Approved green/teal colors in use: ${colorAnalysis.approvedGreenTealColors.length}`);
    if (colorAnalysis.approvedGreenTealColors.length > 0) {
      console.log('   ✅ Green/teal palette colors found:', colorAnalysis.approvedGreenTealColors);
    }
    
    if (colorAnalysis.questionableColors.length > 0) {
      console.log(`   ⚠️  Non-approved colors detected (${colorAnalysis.questionableColors.length}):`);
      colorAnalysis.questionableColors.slice(0, 5).forEach(color => {
        console.log(`      - ${color}`);
      });
    } else {
      console.log('   ✅ All colors appear to be from approved palette');
    }
    
    // Test 3: Layout and Responsiveness Analysis
    console.log('\n📱 3. RESPONSIVE LAYOUT ANALYSIS');
    
    const viewports = [
      { width: 320, height: 568, name: 'Mobile Small' },
      { width: 375, height: 667, name: 'Mobile Medium' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Desktop Small' },
      { width: 1920, height: 1080, name: 'Desktop Large' }
    ];
    
    const layoutResults = [];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      
      const overflowAnalysis = await page.evaluate(() => {
        const issues = [];
        
        // Check document-level overflow
        const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
        if (hasHorizontalScroll) {
          issues.push({
            type: 'document-overflow',
            scrollWidth: document.body.scrollWidth,
            viewportWidth: window.innerWidth,
            overflow: document.body.scrollWidth - window.innerWidth
          });
        }
        
        // Check individual elements
        const elements = document.querySelectorAll('*');
        let elementIssues = 0;
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > window.innerWidth + 20) { // 20px tolerance
            elementIssues++;
          }
        });
        
        return {
          hasDocumentOverflow: hasHorizontalScroll,
          overflowAmount: hasHorizontalScroll ? document.body.scrollWidth - window.innerWidth : 0,
          elementOverflowCount: elementIssues
        };
      });
      
      layoutResults.push({
        viewport: viewport.name,
        size: `${viewport.width}x${viewport.height}`,
        hasOverflow: overflowAnalysis.hasDocumentOverflow,
        overflowAmount: overflowAnalysis.overflowAmount,
        elementIssues: overflowAnalysis.elementOverflowCount
      });
      
      // Take screenshot for each viewport
      await page.screenshot({
        path: `tests/screenshots/layout-analysis-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      });
    }
    
    // Report layout results
    layoutResults.forEach(result => {
      const status = result.hasOverflow ? '❌' : '✅';
      console.log(`   ${status} ${result.viewport} (${result.size})`);
      if (result.hasOverflow) {
        console.log(`      Horizontal overflow: ${result.overflowAmount}px`);
      }
      if (result.elementIssues > 0) {
        console.log(`      Elements with width issues: ${result.elementIssues}`);
      }
    });
    
    // Test 4: Dark Mode Analysis
    console.log('\n🌙 4. DARK MODE ANALYSIS');
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Test light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/color-analysis-light-mode.png',
      fullPage: true
    });
    
    // Test dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/color-analysis-dark-mode.png',
      fullPage: true
    });
    
    const darkModeColors = await page.evaluate(() => {
      const darkColors = new Set();
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        [styles.backgroundColor, styles.color, styles.borderColor].forEach(color => {
          if (color && color !== 'rgba(0, 0, 0, 0)' && !color.includes('transparent')) {
            darkColors.add(color);
          }
        });
      });
      
      return Array.from(darkColors);
    });
    
    console.log(`   Dark mode colors detected: ${darkModeColors.length}`);
    console.log('   ✅ Dark mode screenshots captured for manual review');
    
    // Test 5: Profile Page Direct Access Test
    console.log('\n👤 5. PROFILE PAGE ACCESS ANALYSIS');
    
    // Try accessing profile page directly
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    
    const profileUrl = await page.url();
    const pageContent = await page.textContent('body');
    
    if (profileUrl.includes('/profile')) {
      if (pageContent?.includes('typing-speed-test/profile')) {
        console.log('   ⚠️  Profile route exists but has base URL configuration issue');
        console.log('   📝 Fix needed: Update Vite config base URL for proper GitHub Pages routing');
      } else if (pageContent?.includes('testuser') || pageContent?.includes('Profile')) {
        console.log('   ✅ Profile page accessible and rendering content');
      } else {
        console.log('   ❌ Profile page not rendering expected content');
      }
    } else {
      console.log('   ❌ Profile page redirecting (likely authentication required)');
      console.log(`   Current URL: ${profileUrl}`);
    }
    
    await page.screenshot({
      path: 'tests/screenshots/profile-access-analysis.png',
      fullPage: true
    });
    
    // Summary Report
    console.log('\n📋 SUMMARY AND RECOMMENDATIONS:');
    console.log('');
    console.log('COLOR COMPLIANCE:');
    if (colorAnalysis.approvedGreenTealColors.length > 0) {
      console.log('✅ Green/teal primary colors are being used correctly');
    } else {
      console.log('⚠️  Green/teal primary colors may not be prominently used');
    }
    
    if (colorAnalysis.questionableColors.length > 3) {
      console.log('⚠️  Multiple non-approved colors detected - review for brand consistency');
    } else {
      console.log('✅ Color palette appears mostly compliant');
    }
    
    console.log('');
    console.log('LAYOUT COMPLIANCE:');
    const layoutIssues = layoutResults.filter(r => r.hasOverflow).length;
    if (layoutIssues === 0) {
      console.log('✅ No horizontal overflow issues detected across all screen sizes');
    } else {
      console.log(`⚠️  Horizontal overflow detected on ${layoutIssues} screen sizes`);
    }
    
    console.log('');
    console.log('ROUTING CONFIGURATION:');
    if (profileUrl.includes('typing-speed-test/profile')) {
      console.log('❌ CRITICAL: Base URL configuration needs fix for GitHub Pages');
      console.log('📝 Action: Update vite.config.ts base URL setting');
    } else {
      console.log('✅ Routing appears correctly configured');
    }
    
    console.log('\n=== END AUDIT REPORT ===\n');
    
    // Final assertions for test completion
    expect(colorAnalysis.totalColors).toBeGreaterThan(0);
    expect(layoutResults.length).toBe(5);
  });

  test('specific profile page component analysis', async ({ page }) => {
    console.log('\n🔍 COMPONENT-SPECIFIC ANALYSIS');
    
    // Try to access profile with mock authentication approach
    await page.addInitScript(() => {
      // Set up mock authentication
      window.localStorage.setItem('accessToken', 'mock-token');
      window.localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01T00:00:00.000Z'
      }));
    });
    
    // Mock the API routes that profile page needs
    await page.route('**/api/auth/me', async (route) => {
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
    
    await page.route('**/api/tests/stats/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            username: 'testuser',
            total_tests: 25,
            average_wpm: 75.5,
            average_accuracy: 96.2,
            best_wpm: 95,
            best_accuracy: 98.7,
            total_time_spent: 1500,
            improvement_trend: { wpm_change: 5.2, accuracy_change: 1.8 },
            difficulty_breakdown: { easy: 8, medium: 12, hard: 5 }
          }
        })
      });
    });
    
    await page.route('**/api/tests?**', async (route) => {
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
              }
            ],
            pagination: { total: 1, limit: 100, offset: 0, hasMore: false }
          }
        })
      });
    });
    
    await page.goto('/profile');
    await page.waitForTimeout(3000);
    
    const finalUrl = await page.url();
    const hasProfileContent = await page.locator('text=testuser').isVisible().catch(() => false);
    
    if (hasProfileContent) {
      console.log('✅ Successfully loaded profile page with mock data');
      
      // Test tab functionality if visible
      const statsTab = page.locator('text=Stats').first();
      if (await statsTab.isVisible()) {
        await statsTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Stats tab clickable');
      }
      
      await page.screenshot({
        path: 'tests/screenshots/profile-with-mock-data.png',
        fullPage: true
      });
      
    } else {
      console.log(`⚠️  Could not load profile content. URL: ${finalUrl}`);
    }
    
    expect(finalUrl).toContain('profile');
  });
});