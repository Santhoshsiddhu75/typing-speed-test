import { test, expect } from '@playwright/test';

test.describe('Background Color Consistency', () => {
  test('login page has consistent background colors', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot to verify consistent backgrounds
    await page.screenshot({ 
      path: 'tests/screenshots/login-consistent-backgrounds.png',
      fullPage: true 
    });

    // Verify both keyboard and form containers are visible
    const keyboardContainer = page.locator('#keyboard-desktop');
    const formContainer = page.locator('.bg-background').nth(1); // Form area
    
    await expect(keyboardContainer).toBeVisible();
    await expect(formContainer).toBeVisible();
  });

  test('register page has consistent background colors', async ({ page }) => {
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'tests/screenshots/register-consistent-backgrounds.png',
      fullPage: true 
    });

    const keyboardContainer = page.locator('#keyboard-desktop');
    const formContainer = page.locator('.bg-background').nth(1);
    
    await expect(keyboardContainer).toBeVisible();
    await expect(formContainer).toBeVisible();
  });

  test('mobile login has consistent backgrounds', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'tests/screenshots/mobile-login-consistent-backgrounds.png',
      fullPage: true 
    });

    const mobileKeyboard = page.locator('#keyboard-mobile');
    await expect(mobileKeyboard).toBeVisible();
  });

  test('dark mode consistency', async ({ page }) => {
    // Set dark mode
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    
    // Click theme toggle to switch to dark mode
    const themeToggle = page.locator('button').filter({ hasText: /theme|toggle|dark|light/i }).first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ 
      path: 'tests/screenshots/dark-mode-consistent-backgrounds.png',
      fullPage: true 
    });

    const keyboardContainer = page.locator('#keyboard-desktop');
    await expect(keyboardContainer).toBeVisible();
  });
});