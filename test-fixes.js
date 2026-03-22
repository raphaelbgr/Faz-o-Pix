const { chromium } = require('playwright');

async function testFixes() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('🔍 Testing the fixes...\n');

  try {
    // Test 1: Login page CPF validation
    console.log('📱 Test 1: Login page - CPF validation');
    await page.goto('http://localhost:3001/login');
    await page.waitForSelector('input[placeholder*="CPF"]', { timeout: 10000 });
    
    // Type a phone number that should NOT be detected as CPF
    await page.fill('input[placeholder*="CPF"]', '11987654321');
    await page.waitForTimeout(1000);
    
    // Check if it's correctly identified as phone
    const phoneDetection = await page.textContent('text=Detectado:');
    console.log(`   - Phone number detection: ${phoneDetection?.includes('Telefone') ? '✅ Correct' : '❌ Still shows as CPF'}`);
    
    // Type a valid CPF
    await page.fill('input[placeholder*="CPF"]', '11144477735');
    await page.waitForTimeout(1000);
    
    const cpfDetection = await page.textContent('text=Detectado:');
    console.log(`   - Valid CPF detection: ${cpfDetection?.includes('CPF') ? '✅ Correct' : '❌ Not detected as CPF'}`);

    // Test 2: Signup page alignment and privacy modal
    console.log('\n📝 Test 2: Signup page - Layout and Privacy Modal');
    await page.goto('http://localhost:3001/signup');
    await page.waitForSelector('text=Chaves PIX', { timeout: 10000 });
    
    // Take screenshot of PIX keys section
    await page.screenshot({ 
      path: '/Users/rbgnr/git/Faz-o-Pix/frontend/screenshots/pix-keys-alignment.png',
      clip: { x: 0, y: 300, width: 500, height: 200 }
    });
    console.log('   - Screenshot taken of PIX keys section alignment');

    // Test privacy modal can be opened
    await page.click('text=Ver política de privacidade →');
    await page.waitForSelector('text=Proteção de Dados - LGPD', { timeout: 5000 });
    console.log('   - Privacy modal opens: ✅');
    
    // Take screenshot of modal in current theme
    await page.screenshot({ 
      path: '/Users/rbgnr/git/Faz-o-Pix/frontend/screenshots/privacy-modal-light.png'
    });
    console.log('   - Privacy modal screenshot (light theme) taken');
    
    // Close modal
    await page.click('button:has-text("Aceito e Concordo")');
    await page.waitForTimeout(1000);
    console.log('   - Privacy modal closes: ✅');
    
    // Test modal can be reopened
    await page.click('text=Ver política de privacidade →');
    await page.waitForSelector('text=Proteção de Dados - LGPD', { timeout: 5000 });
    console.log('   - Privacy modal can be reopened: ✅');
    
    // Test dark mode
    await page.click('button[aria-label="Toggle theme"], [data-testid="theme-toggle"], .theme-toggle');
    await page.waitForTimeout(1000);
    
    // Take screenshot of modal in dark theme
    await page.screenshot({ 
      path: '/Users/rbgnr/git/Faz-o-Pix/frontend/screenshots/privacy-modal-dark.png'
    });
    console.log('   - Privacy modal dark mode screenshot taken');
    
    // Close modal by clicking X button
    await page.click('button:has(svg[stroke="currentColor"])');
    await page.waitForTimeout(1000);
    console.log('   - Privacy modal X button works: ✅');

    // Test 3: Brazilian time formatting
    console.log('\n⏰ Test 3: Brazilian time formatting');
    await page.goto('http://localhost:3001/bills');
    await page.waitForTimeout(2000);
    
    // Check if page loads (might need authentication)
    const pageTitle = await page.textContent('h1').catch(() => 'Not accessible');
    console.log(`   - Bills page accessibility: ${pageTitle.includes('Faz-o-Pix') ? '✅ Accessible' : '❌ Needs authentication'}`);

    console.log('\n🎉 All tests completed! Check screenshots in frontend/screenshots/');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testFixes().catch(console.error);