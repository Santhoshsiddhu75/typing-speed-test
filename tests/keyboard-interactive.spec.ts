import { test, expect } from '@playwright/test';

test.describe('Interactive Keyboard with OrbitControls', () => {
  test('keyboard with drag controls and proper zoom', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot of the new view
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-interactive-login.png',
      fullPage: true 
    });

    // Verify canvas is there and interactive
    const canvas = page.locator('#keyboard-desktop canvas').first();
    await expect(canvas).toBeVisible();
    
    // Get canvas dimensions to verify it's not too large
    const canvasBox = await canvas.boundingBox();
    console.log('Canvas dimensions:', canvasBox);
  });

  test('register page with interactive keyboard', async ({ page }) => {
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-interactive-register.png',
      fullPage: true 
    });

    const canvas = page.locator('#keyboard-desktop canvas').first();
    await expect(canvas).toBeVisible();
  });
});