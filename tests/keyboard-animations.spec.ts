import { test, expect } from '@playwright/test';

test.describe('Animated Keyboard Test', () => {
  test('capture animated keyboard screenshots', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for 3D scene to load
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-animated-1.png',
      fullPage: true 
    });
    
    // Wait for some animation time
    await page.waitForTimeout(3000);
    
    // Take screenshot after animation
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-animated-2.png',
      fullPage: true 
    });
    
    // Wait for more animation
    await page.waitForTimeout(3000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-animated-3.png',
      fullPage: true 
    });

    // Verify canvas is still visible and working
    const canvas = page.locator('#keyboard-desktop canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('test register page animations', async ({ page }) => {
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);

    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-animated-register.png',
      fullPage: true 
    });

    const canvas = page.locator('#keyboard-desktop canvas').first();
    await expect(canvas).toBeVisible();
  });
});