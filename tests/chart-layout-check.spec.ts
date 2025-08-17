import { test, expect } from '@playwright/test';

test('Check chart layout and container', async ({ page }) => {
  // First, let's register and login a user
  await page.goto('/register');
  await page.fill('[data-testid="username"]', 'chartuser');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="register-button"]');
  
  // Wait for potential redirect
  await page.waitForTimeout(1000);
  
  // If registration was successful, we might be redirected to login
  if (page.url().includes('/login')) {
    await page.fill('[data-testid="username"]', 'chartuser');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForTimeout(1000);
  }
  
  // Navigate to profile page after authentication
  await page.goto('/profile');
  await page.waitForTimeout(2000);
  
  // Take a screenshot to see the current state
  await page.screenshot({ 
    path: 'chart-layout-issue.png', 
    fullPage: true 
  });
  
  // Check if we can see the chart container or any chart elements
  const chartContainer = page.locator('[data-chart]');
  const progressChart = page.locator('text=Test Progress');
  const cardElements = page.locator('.recharts-wrapper, svg');
  
  console.log('Checking for chart elements...');
  
  if (await chartContainer.isVisible()) {
    console.log('Chart container found');
    const containerBox = await chartContainer.boundingBox();
    console.log('Container bounds:', containerBox);
    await chartContainer.screenshot({ path: 'chart-only.png' });
  } else if (await progressChart.isVisible()) {
    console.log('Progress chart title found');
    await progressChart.screenshot({ path: 'progress-chart-area.png' });
  } else if (await cardElements.first().isVisible()) {
    console.log('SVG/Recharts elements found');
    await cardElements.first().screenshot({ path: 'svg-chart.png' });
  } else {
    console.log('No chart elements found');
  }
  
  // Check for any overflow issues
  await page.evaluate(() => {
    const allChartElements = document.querySelectorAll('[data-chart], .recharts-wrapper, svg');
    allChartElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      console.log(`Chart element ${index} (${element.tagName}) bounds:`, {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        parentWidth: element.parentElement?.getBoundingClientRect().width,
        parentHeight: element.parentElement?.getBoundingClientRect().height,
        isOverflowing: rect.right > window.innerWidth || rect.bottom > window.innerHeight
      });
    });
  });
});