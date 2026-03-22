const { chromium } = require('playwright');

async function simpleTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('📱 Taking screenshots to verify fixes...\n');

  try {
    // Screenshot 1: Login page
    console.log('1. Loading login page...');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'frontend/screenshots/login-page.png', fullPage: true });
    console.log('   ✅ Login page screenshot taken');

    // Test CPF detection by typing
    console.log('2. Testing CPF validation...');
    const input = page.locator('input[placeholder*="CPF"], input[placeholder*="PIX"], input[placeholder*="Identificador"]').first();
    await input.fill('11987654321'); // Phone number
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'frontend/screenshots/phone-detection.png', fullPage: true });
    console.log('   ✅ Phone number input screenshot taken');

    await input.fill('11144477735'); // Valid CPF  
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'frontend/screenshots/cpf-detection.png', fullPage: true });
    console.log('   ✅ CPF input screenshot taken');

    // Screenshot 2: Signup page
    console.log('3. Loading signup page...');
    await page.goto('http://localhost:3001/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'frontend/screenshots/signup-page.png', fullPage: true });
    console.log('   ✅ Signup page screenshot taken');

    // Screenshot 3: PIX keys section (focused area)
    console.log('4. PIX keys section alignment...');
    const pixSection = page.locator('text=Chaves PIX').first();
    if (await pixSection.isVisible()) {
      await pixSection.scrollIntoViewIfNeeded();
      await page.screenshot({ 
        path: 'frontend/screenshots/pix-keys-section.png',
        clip: { x: 100, y: 400, width: 600, height: 300 }
      });
      console.log('   ✅ PIX keys section screenshot taken');
    }

    // Screenshot 4: Privacy modal
    console.log('5. Testing privacy modal...');
    const privacyButton = page.locator('text=Ver política de privacidade →');
    if (await privacyButton.isVisible()) {
      await privacyButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'frontend/screenshots/privacy-modal-light.png', fullPage: true });
      console.log('   ✅ Privacy modal (light) screenshot taken');

      // Test dark mode toggle if available
      const themeToggle = page.locator('[data-theme-toggle], button:has-text("🌓"), button:has-text("☀️"), button:has-text("🌙")').first();
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'frontend/screenshots/privacy-modal-dark.png', fullPage: true });
        console.log('   ✅ Privacy modal (dark) screenshot taken');
      }

      // Close modal
      const closeButton = page.locator('button:has-text("Aceito"), button:has(svg[stroke="currentColor"])').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
        console.log('   ✅ Privacy modal closed');
      }
    }

    console.log('\n🎉 All screenshots taken successfully!');
    console.log('📂 Check the frontend/screenshots/ folder for the images');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'frontend/screenshots/error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

simpleTest().catch(console.error);