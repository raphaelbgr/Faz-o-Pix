const { chromium } = require('playwright');

// Configuration
const CONFIG = {
  FRONTEND_URL: 'http://localhost:3000',
  BACKEND_URL: 'http://localhost:3001',
  TEST_USER: {
    identifier: '21988856697',
    password: 'Tjq5uxt3!'
  },
  SPECIFIC_BILL_ID: '9b525d7e-6ae7-4111-a73c-16bfc3eee1a7'
};

async function testDarkModeIssues() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('🌙 Testing dark mode issues and design improvements...\n');
  console.log(`Using Frontend: ${CONFIG.FRONTEND_URL}`);
  console.log(`Using Backend: ${CONFIG.BACKEND_URL}\n`);

  try {
    // 1. Login first
    console.log('1. Logging in...');
    await page.goto(`${CONFIG.FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    const identifierInput = page.locator('input[type="text"]').first();
    await identifierInput.waitFor({ timeout: 5000 });
    await identifierInput.fill(CONFIG.TEST_USER.identifier);
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(CONFIG.TEST_USER.password);
    
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    
    await page.waitForURL('**/bills', { timeout: 10000 });
    console.log('   ✅ Logged in successfully');

    // 2. Test bills list in light mode
    console.log('2. Testing bills list (light mode)...');
    await page.screenshot({ 
      path: 'screenshots/bills-list-light-detailed.png',
      fullPage: true 
    });
    console.log('   ✅ Bills list light mode screenshot taken');

    // 3. Switch to dark mode
    console.log('3. Switching to dark mode...');
    const themeToggle = page.locator('button').first(); // Theme toggle is usually first button
    await themeToggle.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/bills-list-dark-detailed.png',
      fullPage: true 
    });
    console.log('   ✅ Bills list dark mode screenshot taken');

    // 4. Test specific bill page
    console.log('4. Testing specific bill page...');
    await page.goto(`${CONFIG.FRONTEND_URL}/bills/${CONFIG.SPECIFIC_BILL_ID}`);
    await page.waitForLoadState('networkidle');
    
    // Light mode first
    const themeToggleOnBill = page.locator('button').first();
    await themeToggleOnBill.click(); // Switch back to light
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/specific-bill-light.png',
      fullPage: true 
    });
    console.log('   ✅ Specific bill light mode screenshot taken');

    // Dark mode
    await themeToggleOnBill.click(); // Switch to dark
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/specific-bill-dark.png',
      fullPage: true 
    });
    console.log('   ✅ Specific bill dark mode screenshot taken');

    // 5. Analyze elements that might not be respecting theme
    console.log('5. Analyzing theme compliance...');
    
    const elementsToCheck = [
      'h1, h2, h3, h4, h5, h6',
      'p',
      'span',
      'button',
      'input',
      'div[class*="bg-"]',
      'div[class*="text-"]'
    ];
    
    for (const selector of elementsToCheck) {
      const elements = await page.locator(selector).count();
      console.log(`   Found ${elements} elements matching "${selector}"`);
    }

    console.log('\n🎉 Dark mode testing completed!');
    console.log('📂 Check screenshots/ folder for visual analysis');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/dark-mode-test-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

testDarkModeIssues().catch(console.error);