import { test, expect } from '@playwright/test';

test('quick drag test', async ({ page }) => {
  const consoleMessages: string[] = [];
  
  page.on('console', (msg) => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  await page.goto('/#/login');
  await page.waitForTimeout(3000);

  console.log('All console messages:');
  consoleMessages.forEach(msg => console.log(msg));

  const canvas = page.locator('#keyboard-desktop canvas').first();
  const isVisible = await canvas.isVisible();
  console.log('Canvas visible:', isVisible);

  if (isVisible) {
    const box = await canvas.boundingBox();
    console.log('Canvas position:', box);
    
    // Simple mouse move over canvas
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: 'tests/screenshots/quick-test.png' });
});