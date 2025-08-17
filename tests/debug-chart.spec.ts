import { test, expect } from '@playwright/test';

test('Debug chart at correct profile URL', async ({ page }) => {
  // Navigate directly to the correct profile URL
  await page.goto('http://localhost:5173/#/profile');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Take a screenshot to see the current state
  await page.screenshot({ 
    path: 'profile-page-debug.png', 
    fullPage: true 
  });
  
  // Check what we can see
  const progressChart = page.locator('text=Test Progress');
  const chartContainer = page.locator('[data-chart]');
  const noTestsMessage = page.locator('text=No tests taken yet');
  
  if (await progressChart.isVisible()) {
    console.log('✓ Progress chart title found');
    
    if (await chartContainer.isVisible()) {
      console.log('✓ Chart container found');
      await chartContainer.screenshot({ path: 'chart-container-debug.png' });
    } else {
      console.log('✗ Chart container not visible');
    }
    
    if (await noTestsMessage.isVisible()) {
      console.log('! No tests message visible - user has no test data');
    }
    
  } else {
    console.log('✗ Progress chart title not found');
  }
  
  // Log any console errors
  page.on('console', msg => console.log('Browser console:', msg.text()));
  
  // Check for recharts/svg elements
  const svgElements = page.locator('svg');
  const svgCount = await svgElements.count();
  console.log(`Found ${svgCount} SVG elements`);
  
  if (svgCount > 0) {
    await svgElements.first().screenshot({ path: 'svg-debug.png' });
  }
});