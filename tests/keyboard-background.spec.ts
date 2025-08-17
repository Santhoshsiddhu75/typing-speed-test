import { test, expect } from '@playwright/test';

test.describe('KeyboardBackground Component', () => {
  test.beforeEach(async ({ page }) => {
    // Start dev server and navigate to login page
    await page.goto('/#/login');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('login page loads without errors', async ({ page }) => {
    // Check that page loaded without console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any async errors to appear
    await page.waitForTimeout(2000);

    // Check basic page structure
    await expect(page.locator('h1')).toContainText('Sign In');
    
    // Log any errors found
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }
    
    // The test should pass even if there are some non-critical errors
    // but we want to see what they are
    expect(errors.filter(e => 
      !e.includes('404') && // Ignore 404 errors for model file
      !e.includes('Failed to load') && // Ignore load failures
      !e.includes('net::ERR_') // Ignore network errors
    )).toHaveLength(0);
  });

  test('register page loads without errors', async ({ page }) => {
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    await expect(page.locator('h1')).toContainText('Create Account');
    
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }
    
    expect(errors.filter(e => 
      !e.includes('404') && 
      !e.includes('Failed to load') && 
      !e.includes('net::ERR_')
    )).toHaveLength(0);
  });

  test('keyboard background container exists', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    
    // Check if the keyboard background containers exist
    const desktopKeyboard = page.locator('#keyboard-desktop');
    const mobileKeyboard = page.locator('#keyboard-mobile');
    
    // At least one should be visible depending on viewport
    const desktopVisible = await desktopKeyboard.isVisible();
    const mobileVisible = await mobileKeyboard.isVisible();
    
    expect(desktopVisible || mobileVisible).toBeTruthy();
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-background-login.png',
      fullPage: true 
    });
  });

  test('3D canvas renders', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential 3D content to load
    await page.waitForTimeout(3000);
    
    // Look for canvas element (Three.js renders to canvas)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Check canvas has reasonable dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox?.width).toBeGreaterThan(100);
    expect(canvasBox?.height).toBeGreaterThan(100);
  });

  test('mobile view renders correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    
    // Check mobile keyboard container
    const mobileKeyboard = page.locator('#keyboard-mobile');
    await expect(mobileKeyboard).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-background-mobile.png',
      fullPage: true 
    });
  });

  test('desktop view renders correctly', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    
    // Check desktop keyboard container
    const desktopKeyboard = page.locator('#keyboard-desktop');
    await expect(desktopKeyboard).toBeVisible();
    
    // Take desktop screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-background-desktop.png',
      fullPage: true 
    });
  });
});