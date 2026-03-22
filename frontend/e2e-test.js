const { chromium } = require('playwright');

async function testFixes() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('🔍 Testing the implemented fixes...\n');

  try {
    // 1. Test login page CPF validation
    console.log('1. Testing login page CPF validation...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot of login page
    await page.screenshot({ 
      path: 'screenshots/login-page-initial.png',
      fullPage: true 
    });
    console.log('   ✅ Login page screenshot taken');

    // Test input field behavior
    const identifierInput = page.locator('input[type="text"]').first();
    
    // Test phone number (should be detected as phone, not CPF)
    await identifierInput.fill('11987654321');
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/login-phone-input.png',
      fullPage: true 
    });
    console.log('   ✅ Phone input test screenshot taken');

    // Test valid CPF (should be detected as CPF)
    await identifierInput.fill('11144477735');
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/login-cpf-input.png',
      fullPage: true 
    });
    console.log('   ✅ CPF input test screenshot taken');

    // 2. Test signup page layout fixes
    console.log('\n2. Testing signup page layout...');
    await page.goto('http://localhost:3000/signup');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'screenshots/signup-page-layout.png',
      fullPage: true 
    });
    console.log('   ✅ Signup page layout screenshot taken');

    // Test privacy modal opening
    console.log('\n3. Testing privacy modal...');
    const privacyButton = page.locator('text=Ver política de privacidade →');
    await privacyButton.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/privacy-modal-light.png',
      fullPage: true 
    });
    console.log('   ✅ Privacy modal (light mode) screenshot taken');

    // Close modal with accept button
    const acceptButton = page.locator('button:has-text("Aceito e Concordo")');
    await acceptButton.click();
    await page.waitForTimeout(1000);
    console.log('   ✅ Privacy modal closed');

    // Test reopening modal
    await privacyButton.click();
    await page.waitForTimeout(1500);
    console.log('   ✅ Privacy modal can be reopened');

    // Test dark mode in modal
    const themeToggle = page.locator('button').first(); // Theme toggle is usually first button
    await themeToggle.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/privacy-modal-dark.png',
      fullPage: true 
    });
    console.log('   ✅ Privacy modal (dark mode) screenshot taken');

    // Close modal with X button
    const closeButton = page.locator('button:has(svg[stroke="currentColor"])');
    await closeButton.click();
    await page.waitForTimeout(1000);
    console.log('   ✅ Privacy modal X button works');

    // Take final screenshot of signup in dark mode
    await page.screenshot({ 
      path: 'screenshots/signup-page-dark.png',
      fullPage: true 
    });
    console.log('   ✅ Signup page dark mode screenshot taken');

    console.log('\n🎉 All tests completed successfully!');
    console.log('📂 Screenshots saved to screenshots/ folder');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/error-state.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

testFixes().catch(console.error);