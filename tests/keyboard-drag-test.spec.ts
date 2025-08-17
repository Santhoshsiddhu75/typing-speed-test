import { test, expect } from '@playwright/test';

test.describe('Keyboard Drag Controls Test', () => {
  test('verify OrbitControls debug messages appear', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    // Capture console messages
    page.on('console', (msg) => {
      if (msg.text().includes('OrbitControls')) {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to drag on the 3D canvas area
    const canvas = page.locator('#keyboard-desktop canvas').first();
    await expect(canvas).toBeVisible();

    // Perform drag action
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      // Start drag from center of canvas
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 50, centerY + 50);
      await page.mouse.up();
    }

    // Wait for any console messages
    await page.waitForTimeout(1000);
    
    console.log('OrbitControls messages:', consoleMessages);

    // Take screenshot after interaction
    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-drag-interaction.png',
      fullPage: true 
    });

    // Verify canvas is still visible after interaction
    await expect(canvas).toBeVisible();
  });

  test('test zoom interaction', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const canvas = page.locator('#keyboard-desktop canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      
      // Test zoom with mouse wheel
      await page.mouse.move(centerX, centerY);
      await page.mouse.wheel(0, -100); // Zoom in
      await page.waitForTimeout(500);
      await page.mouse.wheel(0, 100);  // Zoom out
    }

    await page.screenshot({ 
      path: 'tests/screenshots/keyboard-zoom-test.png',
      fullPage: true 
    });
  });
});