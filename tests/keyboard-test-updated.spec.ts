import { test, expect } from '@playwright/test';

test.describe('Updated KeyboardBackground - Top View & Green Lighting', () => {
  test('check console for GLTF loading debug messages', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    // Capture all console messages
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for 3D scene to load
    await page.waitForTimeout(3000);

    // Log all console messages for debugging
    console.log('Console messages:', consoleMessages);
    
    // Take screenshot to see the updated view
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-top-view-login.png',
      fullPage: true 
    });

    // Check if model loaded successfully or if we see fallback
    const hasSuccessMessage = consoleMessages.some(msg => 
      msg.includes('✅ Keyboard GLTF model loaded successfully')
    );
    const hasFailureMessage = consoleMessages.some(msg => 
      msg.includes('❌ Failed to load GLTF model')
    );

    console.log('Model loaded successfully:', hasSuccessMessage);
    console.log('Model failed to load:', hasFailureMessage);

    // Canvas should still be visible
    const canvas = page.locator('#keyboard-desktop canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('verify green lighting and top view on register page', async ({ page }) => {
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-top-view-register.png',
      fullPage: true 
    });

    // Canvas should be rendering
    const canvas = page.locator('#keyboard-desktop canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('mobile view with updated keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take mobile screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-top-view-mobile.png',
      fullPage: true 
    });

    const canvas = page.locator('#keyboard-mobile canvas').first();
    await expect(canvas).toBeVisible();
  });
});