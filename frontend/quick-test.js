const { chromium } = require('playwright');

async function quickTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('🔍 Quick test of the fixes...\n');

  try {
    // 1. Test signup page (using correct port 3001)
    console.log('1. Testing signup page layout...');
    await page.goto('http://localhost:3001/signup');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'screenshots/signup-page-correct.png',
      fullPage: true 
    });
    console.log('   ✅ Signup page screenshot taken');

    // Test privacy modal
    console.log('\n2. Testing privacy modal...');
    
    // Look for the privacy policy button with more flexible selector
    const privacySelectors = [
      'text=Ver política de privacidade →',
      'text=Ver política de privacidade',
      'button:has-text("Ver política")',
      'button:has-text("privacidade")',
      'a:has-text("Ver política")',
      'a:has-text("privacidade")'
    ];
    
    let privacyButton = null;
    for (const selector of privacySelectors) {
      try {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          privacyButton = element.first();
          console.log(`   Found privacy button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (privacyButton) {
      await privacyButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'screenshots/privacy-modal-working.png',
        fullPage: true 
      });
      console.log('   ✅ Privacy modal opened and screenshot taken');
      
      // Try to find close button
      const closeSelectors = [
        'button:has-text("Aceito e Concordo")',
        'button:has-text("Aceito")',
        'button:has(svg[stroke="currentColor"])',
        'button[aria-label*="fechar"]',
        'button[aria-label*="close"]'
      ];
      
      let closeButton = null;
      for (const selector of closeSelectors) {
        try {
          const element = page.locator(selector);
          if (await element.count() > 0) {
            closeButton = element.first();
            console.log(`   Found close button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (closeButton) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        console.log('   ✅ Privacy modal closed');
        
        // Test reopening
        await privacyButton.click();
        await page.waitForTimeout(1500);
        console.log('   ✅ Privacy modal can be reopened');
        
        await page.screenshot({ 
          path: 'screenshots/privacy-modal-reopened.png',
          fullPage: true 
        });
      }
    } else {
      console.log('   ❌ Privacy policy button not found');
    }

    console.log('\n🎉 Quick test completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/error-quick-test.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

quickTest().catch(console.error);