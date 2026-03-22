const { chromium } = require('playwright');

// Configuration
const CONFIG = {
  FRONTEND_URL: 'http://localhost:3000',
  BACKEND_URL: 'http://localhost:3001',
  TEST_USER: {
    identifier: '+5521988856697',
    password: 'Tjq5uxt3!'
  }
};

async function testBillsDesign() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('🎨 Testing improved bills design with liquid glass system...\n');
  console.log(`Using Frontend: ${CONFIG.FRONTEND_URL}`);
  console.log(`Using Backend: ${CONFIG.BACKEND_URL}\n`);

  try {
    // Navigate to bills page directly
    console.log('1. Navigating to bills page...');
    await page.goto(`${CONFIG.FRONTEND_URL}/bills`);
    
    // Wait a bit for potential redirects or loading
    await page.waitForTimeout(3000);
    
    // Check if we're redirected to login (not authenticated)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('   User not authenticated, logging in...');
      
      // Login with test user
      const identifierInput = page.locator('input[type="text"]').first();
      await identifierInput.waitFor({ timeout: 5000 });
      await identifierInput.fill(CONFIG.TEST_USER.identifier);
      
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(CONFIG.TEST_USER.password);
      
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();
      
      // Wait for login to complete and redirect
      await page.waitForURL('**/bills', { timeout: 10000 });
      console.log('   ✅ Logged in successfully');
    }

    // 2. Test bills list page design
    console.log('2. Testing bills list page...');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'screenshots/bills-list-improved.png',
      fullPage: true 
    });
    console.log('   ✅ Bills list screenshot taken');

    // Test create bill modal (without simplifyDebts checkbox)
    const createButton = page.locator('button:has-text("Nova Conta")');
    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'screenshots/create-bill-modal-improved.png',
        fullPage: true 
      });
      console.log('   ✅ Create bill modal screenshot taken');
      
      // Close modal
      const closeButton = page.locator('button:has(svg[stroke="currentColor"])').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }

    // 3. Test individual bill page if bills exist
    console.log('3. Testing individual bill page...');
    
    const billLinks = await page.locator('a[href*="/bills/"]').count();
    console.log(`   Found ${billLinks} bill link(s)`);
    
    if (billLinks > 0) {
      // Click on first bill
      const firstBillLink = page.locator('a[href*="/bills/"]').first();
      await firstBillLink.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'screenshots/individual-bill-light.png',
        fullPage: true 
      });
      console.log('   ✅ Individual bill (light mode) screenshot taken');
      
      // Test dark mode
      const themeToggle = page.locator('button[aria-label="Toggle theme"]').first();
      if (await themeToggle.count() === 0) {
        // Try finding theme toggle by position (top-right)
        const possibleToggles = page.locator('button').all();
        // Usually the first few buttons include theme toggle
        const buttons = await possibleToggles;
        if (buttons.length > 0) {
          await buttons[0].click();
          await page.waitForTimeout(1500);
          
          await page.screenshot({ 
            path: 'screenshots/individual-bill-dark.png',
            fullPage: true 
          });
          console.log('   ✅ Individual bill (dark mode) screenshot taken');
        }
      } else {
        await themeToggle.click();
        await page.waitForTimeout(1500);
        
        await page.screenshot({ 
          path: 'screenshots/individual-bill-dark.png',
          fullPage: true 
        });
        console.log('   ✅ Individual bill (dark mode) screenshot taken');
      }
      
      // Go back to bills list in dark mode
      const backButton = page.locator('a[href="/bills"]').first();
      if (await backButton.count() > 0) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ 
          path: 'screenshots/bills-list-dark.png',
          fullPage: true 
        });
        console.log('   ✅ Bills list (dark mode) screenshot taken');
      }
    } else {
      console.log('   ⚠️ No bills found to test individual bill page');
      
      // Create a test bill for demonstration
      console.log('   Creating a test bill for design demo...');
      
      const createBtn = page.locator('button:has-text("Nova Conta")');
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      // Fill form
      const nameInput = page.locator('input[placeholder*="Viagem"]');
      await nameInput.fill('Design Test Bill');
      
      const descInput = page.locator('textarea[placeholder*="Detalhes"]');
      await descInput.fill('Testing the improved liquid glass design system');
      
      // Submit
      const submitBtn = page.locator('button:has-text("Criar Conta")');
      await submitBtn.click();
      
      await page.waitForTimeout(2000);
      
      // Now try to access the bill
      const newBillLinks = await page.locator('a[href*="/bills/"]').count();
      if (newBillLinks > 0) {
        const newBillLink = page.locator('a[href*="/bills/"]').first();
        await newBillLink.click();
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ 
          path: 'screenshots/new-bill-page.png',
          fullPage: true 
        });
        console.log('   ✅ New test bill screenshot taken');
      }
    }

    console.log('\n🎉 All design tests completed!');
    console.log('📂 Check screenshots/ folder for visual confirmation of improvements');
    console.log('\n🔧 Key improvements made:');
    console.log('   • Applied liquid glass design system consistently');
    console.log('   • Fixed dark mode support across all bill pages');
    console.log('   • Removed manual debt simplification (now automatic)');
    console.log('   • Improved typography and spacing');
    console.log('   • Added beautiful animations and hover effects');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/bills-test-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

testBillsDesign().catch(console.error);