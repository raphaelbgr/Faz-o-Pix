// Simple test to check if dark mode is working
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to the homepage
  await page.goto('http://localhost:3000');
  
  // Wait for the theme toggle button to be visible
  await page.waitForSelector('button[aria-label*="Switch to"]', { timeout: 5000 });
  
  // Get initial theme state
  const initialTheme = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  console.log('Initial theme:', initialTheme);
  
  // Take screenshot before toggle
  await page.screenshot({ path: 'before-toggle.png' });
  
  // Click the theme toggle button
  await page.click('button[aria-label*="Switch to"]');
  
  // Wait a moment for the theme to change
  await page.waitForTimeout(500);
  
  // Get theme after toggle
  const afterToggleTheme = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  console.log('Theme after toggle:', afterToggleTheme);
  
  // Take screenshot after toggle
  await page.screenshot({ path: 'after-toggle.png' });
  
  // Check if theme actually changed
  if (initialTheme !== afterToggleTheme) {
    console.log('✅ Dark mode toggle is working!');
  } else {
    console.log('❌ Dark mode toggle is NOT working');
  }
  
  await browser.close();
})();