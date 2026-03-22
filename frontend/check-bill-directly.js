const { chromium } = require('playwright');

async function checkBillDirectly() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('🔍 Checking specific bill page directly...\n');

  try {
    // Go directly to the specific bill page
    await page.goto('http://localhost:3000/bills/9b525d7e-6ae7-4111-a73c-16bfc3eee1a7');
    await page.waitForTimeout(3000);
    
    // Check if redirected to login
    if (page.url().includes('/login')) {
      console.log('Redirected to login, logging in...');
      
      const identifierInput = page.locator('input[type="text"]').first();
      await identifierInput.fill('21988856697');
      
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill('tjq5uxt3');
      
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();
      
      await page.waitForTimeout(5000);
      console.log('Login attempted, current URL:', page.url());
    }
    
    // Take screenshots regardless of the state
    await page.screenshot({ 
      path: 'screenshots/current-bill-state.png',
      fullPage: true 
    });
    console.log('Screenshot taken of current state');
    
    // Try to find and click theme toggle
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on page`);
    
    if (buttons.length > 0) {
      console.log('Clicking first button (likely theme toggle)...');
      await buttons[0].click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'screenshots/after-theme-toggle.png',
        fullPage: true 
      });
      console.log('Screenshot taken after theme toggle');
    }

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/error-state.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

checkBillDirectly().catch(console.error);