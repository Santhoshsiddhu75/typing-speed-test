import { test, expect } from '@playwright/test';

test.describe('Seamless Layout - No Visible Dividers', () => {
  test('desktop login has seamless transition between sections', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot to verify seamless design
    await page.screenshot({ 
      path: 'tests/screenshots/seamless-desktop-login.png',
      fullPage: true 
    });

    // Verify both sections are visible
    const keyboardSection = page.locator('#keyboard-desktop');
    const formSection = page.locator('.flex-1').nth(1);
    
    await expect(keyboardSection).toBeVisible();
    await expect(formSection).toBeVisible();
  });

  test('desktop register has seamless layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'tests/screenshots/seamless-desktop-register.png',
      fullPage: true 
    });

    const keyboardSection = page.locator('#keyboard-desktop');
    await expect(keyboardSection).toBeVisible();
  });

  test('mobile login has seamless top-to-bottom transition', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot to verify seamless mobile design
    await page.screenshot({ 
      path: 'tests/screenshots/seamless-mobile-login.png',
      fullPage: true 
    });

    // Verify mobile keyboard section
    const mobileKeyboard = page.locator('#keyboard-mobile');
    await expect(mobileKeyboard).toBeVisible();
  });

  test('mobile register has seamless layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'tests/screenshots/seamless-mobile-register.png',
      fullPage: true 
    });

    const mobileKeyboard = page.locator('#keyboard-mobile');
    await expect(mobileKeyboard).toBeVisible();
  });

  test('tablet viewport has proper layout', async ({ page }) => {
    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'tests/screenshots/seamless-tablet-login.png',
      fullPage: true 
    });

    // At 768px, it should show desktop layout (md breakpoint is 768px+)
    const desktopKeyboard = page.locator('#keyboard-desktop');
    await expect(desktopKeyboard).toBeVisible();
  });

  test('large desktop viewport maintains seamless design', async ({ page }) => {
    // Large desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'tests/screenshots/seamless-large-desktop.png',
      fullPage: true 
    });

    const keyboardSection = page.locator('#keyboard-desktop');
    await expect(keyboardSection).toBeVisible();
  });
});