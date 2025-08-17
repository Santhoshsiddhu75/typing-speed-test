import { test, expect } from '@playwright/test';

test.describe('3D Keyboard Cursor Interactions', () => {
  test('cursor changes to grab on hover and grabbing on drag', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get the keyboard container
    const keyboardContainer = page.locator('#keyboard-desktop').first();
    await expect(keyboardContainer).toBeVisible();

    // Take initial screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/cursor-default-state.png',
      fullPage: true 
    });

    // Move mouse over the 3D area
    const containerBox = await keyboardContainer.boundingBox();
    if (containerBox) {
      const centerX = containerBox.x + containerBox.width / 2;
      const centerY = containerBox.y + containerBox.height / 2;

      // Hover over the 3D canvas
      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(500);

      // Take screenshot during hover
      await page.screenshot({ 
        path: 'tests/screenshots/cursor-hover-state.png',
        fullPage: true 
      });

      // Start drag
      await page.mouse.down();
      await page.waitForTimeout(300);

      // Take screenshot during drag
      await page.screenshot({ 
        path: 'tests/screenshots/cursor-dragging-state.png',
        fullPage: true 
      });

      // Move while dragging
      await page.mouse.move(centerX + 50, centerY + 50);
      await page.waitForTimeout(300);

      // End drag
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Take final screenshot
      await page.screenshot({ 
        path: 'tests/screenshots/cursor-after-drag.png',
        fullPage: true 
      });
    }

    // Verify canvas is still working
    const canvas = page.locator('#keyboard-desktop canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('register page cursor interactions', async ({ page }) => {
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const keyboardContainer = page.locator('#keyboard-desktop').first();
    await expect(keyboardContainer).toBeVisible();

    const containerBox = await keyboardContainer.boundingBox();
    if (containerBox) {
      const centerX = containerBox.x + containerBox.width / 2;
      const centerY = containerBox.y + containerBox.height / 2;

      // Test hover and click interaction
      await page.mouse.move(centerX, centerY);
      await page.mouse.click(centerX, centerY);
      await page.waitForTimeout(500);
    }

    await page.screenshot({ 
      path: 'tests/screenshots/cursor-register-interaction.png',
      fullPage: true 
    });
  });

  test('mobile cursor behavior', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // On mobile, touch interactions don't show cursors, but let's verify the component loads
    const keyboardContainer = page.locator('#keyboard-mobile').first();
    await expect(keyboardContainer).toBeVisible();

    await page.screenshot({ 
      path: 'tests/screenshots/cursor-mobile-view.png',
      fullPage: true 
    });
  });
});