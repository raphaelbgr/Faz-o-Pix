const { chromium } = require('playwright');

async function testSpecificBill() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  console.log('🔍 Testing specific bill page for design issues...\n');

  try {
    // 1. Login first
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    const identifierInput = page.locator('input[type="text"]').first();
    await identifierInput.fill('21988856697');
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('tjq5uxt3');
    
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    await page.waitForTimeout(3000);

    // 2. Click on the bill to navigate to its details
    console.log('2. Clicking on the bill...');
    const billLink = page.locator('a[href*="/bills/"]').first();
    await billLink.click();
    await page.waitForLoadState('networkidle');
    
    console.log(`Current URL: ${page.url()}`);
    
    // 3. Take screenshot in light mode
    await page.screenshot({ 
      path: 'screenshots/specific-bill-light-mode.png',
      fullPage: true 
    });
    console.log('   ✅ Light mode screenshot taken');
    
    // 4. Switch to dark mode
    console.log('3. Testing dark mode...');
    const themeToggle = page.locator('button').first();
    await themeToggle.click();
    await page.waitForTimeout(1500);
    
    await page.screenshot({ 
      path: 'screenshots/specific-bill-dark-mode.png',
      fullPage: true 
    });
    console.log('   ✅ Dark mode screenshot taken');
    
    // 5. Analyze elements for theme issues
    console.log('4. Analyzing theme compliance...');
    
    // Get all elements with potential theme issues
    const hardcodedColors = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues = [];
      
      elements.forEach((el, index) => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const color = styles.color;
        
        // Look for hardcoded colors that might not respect theme
        if (bgColor.includes('rgb(255, 255,') || 
            bgColor.includes('rgb(0, 0,') ||
            color.includes('rgb(0, 0,') ||
            color.includes('rgb(255, 255,')) {
          issues.push({
            tagName: el.tagName,
            className: el.className,
            backgroundColor: bgColor,
            color: color,
            text: el.textContent?.substring(0, 50)
          });
        }
      });
      
      return issues.slice(0, 10); // Limit to first 10 issues
    });
    
    console.log('   Found potential theme issues:');
    hardcodedColors.forEach((issue, index) => {
      console.log(`     ${index + 1}. ${issue.tagName}.${issue.className}: bg=${issue.backgroundColor}, color=${issue.color}`);
    });

    console.log('\n🎉 Analysis completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/error-analysis.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

testSpecificBill().catch(console.error);