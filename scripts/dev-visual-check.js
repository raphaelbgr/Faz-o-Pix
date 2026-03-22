#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

async function takeDesignScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const screenshotDir = path.join(__dirname, '..', 'design-screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });
  
  const baseURL = 'http://localhost:3000';
  
  const pages = [
    { name: 'homepage', url: '/' },
    { name: 'login', url: '/login' },
    { name: 'signup', url: '/signup' }
  ];
  
  for (const pageInfo of pages) {
    try {
      console.log(`Taking screenshot of ${pageInfo.name}...`);
      await page.goto(`${baseURL}${pageInfo.url}`);
      await page.waitForLoadState('networkidle');
      
      // Light theme
      await page.screenshot({
        path: path.join(screenshotDir, `${pageInfo.name}-light.png`),
        fullPage: true
      });
      
      // Try to toggle dark theme if available
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(500); // Wait for theme transition
        
        await page.screenshot({
          path: path.join(screenshotDir, `${pageInfo.name}-dark.png`),
          fullPage: true
        });
      }
      
      // Mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.screenshot({
        path: path.join(screenshotDir, `${pageInfo.name}-mobile.png`),
        fullPage: true
      });
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      
    } catch (error) {
      console.error(`Error taking screenshot for ${pageInfo.name}:`, error.message);
    }
  }
  
  await browser.close();
  console.log(`Screenshots saved to ${screenshotDir}`);
}

if (require.main === module) {
  takeDesignScreenshots().catch(console.error);
}

module.exports = { takeDesignScreenshots };