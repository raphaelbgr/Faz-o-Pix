const { chromium } = require('playwright');

async function analyzeBillsLayout() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('🔍 Analyzing bills page layout issues...\n');

  try {
    // 1. Go to login and login first
    console.log('1. Logging in...');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    // Login with test user
    const identifierInput = page.locator('input[type="text"]').first();
    await identifierInput.fill('+5521988856697');
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Tjq5uxt3!');
    
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    
    await page.waitForTimeout(3000); // Wait for login to complete
    
    // 2. Take screenshot of bills list page
    console.log('2. Analyzing bills list page...');
    await page.goto('http://localhost:3001/bills');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'screenshots/bills-list-current.png',
      fullPage: true 
    });
    console.log('   ✅ Bills list screenshot taken');

    // 3. Check if there are any bills to view individual bill page
    const billLinks = await page.locator('a[href*="/bills/"]').count();
    console.log(`   Found ${billLinks} bill link(s)`);
    
    if (billLinks > 0) {
      const firstBillLink = page.locator('a[href*="/bills/"]').first();
      await firstBillLink.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'screenshots/individual-bill-current.png',
        fullPage: true 
      });
      console.log('   ✅ Individual bill screenshot taken');
      
      // Test dark mode on individual bill page
      const themeToggle = page.locator('button').first();
      await themeToggle.click();
      await page.waitForTimeout(1500);
      
      await page.screenshot({ 
        path: 'screenshots/individual-bill-dark-current.png',
        fullPage: true 
      });
      console.log('   ✅ Individual bill dark mode screenshot taken');
    } else {
      console.log('   ⚠️ No bills found to analyze individual bill page');
    }

    console.log('\n🎉 Analysis completed!');
    console.log('📂 Screenshots saved to screenshots/ folder');

  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/bills-analysis-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

analyzeBillsLayout().catch(console.error);