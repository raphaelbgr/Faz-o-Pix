const { chromium } = require('playwright');

// Configuration
const CONFIG = {
  FRONTEND_URL: 'http://localhost:3000',
  TEST_USER: {
    identifier: '21988856697',
    password: 'tjq5uxt3'
  },
  SPECIFIC_BILL_ID: '9b525d7e-6ae7-4111-a73c-16bfc3eee1a7'
};

async function testNavigateToBill() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('🎯 Testing navigation to specific bill page...\n');

  try {
    // 1. Login first
    console.log('1. Logging in...');
    await page.goto(`${CONFIG.FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    const identifierInput = page.locator('input[type="text"]').first();
    await identifierInput.fill(CONFIG.TEST_USER.identifier);
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(CONFIG.TEST_USER.password);
    
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    await page.waitForTimeout(3000);
    console.log('   ✅ Logged in successfully');

    // 2. Take screenshot of bills list
    await page.screenshot({ 
      path: 'screenshots/bills-list-before-click.png',
      fullPage: true 
    });
    console.log('   ✅ Bills list screenshot taken');

    // 3. Click on the specific bill by name
    console.log('2. Looking for the Viagem para Dubai bill...');
    const billLinks = await page.locator('a[href*="/bills/"]').all();
    console.log(`   Found ${billLinks.length} bill links`);

    // Try to find the link that contains "Viagem para Dubai"
    let foundBill = false;
    for (let i = 0; i < billLinks.length; i++) {
      const text = await billLinks[i].textContent();
      console.log(`   Bill ${i + 1}: ${text?.substring(0, 50)}...`);
      if (text && text.includes('Viagem para Dubai')) {
        console.log('   🎯 Found the target bill! Clicking...');
        await billLinks[i].click();
        foundBill = true;
        break;
      }
    }

    if (!foundBill) {
      console.log('   🔄 Bill not found by text, trying direct URL...');
      await page.goto(`${CONFIG.FRONTEND_URL}/bills/${CONFIG.SPECIFIC_BILL_ID}`);
    }

    await page.waitForTimeout(3000);
    console.log(`   Current URL: ${page.url()}`);

    // 4. Take screenshots of the individual bill page
    console.log('3. Taking screenshots of individual bill page...');
    
    // Light mode
    await page.screenshot({ 
      path: 'screenshots/individual-bill-light.png',
      fullPage: true 
    });
    console.log('   ✅ Individual bill light mode screenshot taken');
    
    // Switch to dark mode
    const themeToggle = page.locator('button').first();
    await themeToggle.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/individual-bill-dark.png',
      fullPage: true 
    });
    console.log('   ✅ Individual bill dark mode screenshot taken');

    console.log('\n🎉 Navigation test completed!');

  } catch (error) {
    console.error('❌ Navigation error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/navigation-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

testNavigateToBill().catch(console.error);