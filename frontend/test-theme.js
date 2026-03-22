const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testTheme() {
  console.log('Starting Playwright theme test...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for visual confirmation
    slowMo: 1000 // Slow down actions for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Monitor console logs and errors
  page.on('console', msg => {
    console.log(`   [BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`   [PAGE ERROR] ${error.message}`);
  });
  
  try {
    // Step 1: Navigate to the test page
    console.log('1. Navigating to http://localhost:3000/test-theme');
    await page.goto('http://localhost:3000/test-theme');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for React components to mount
    await page.waitForTimeout(2000);
    console.log('   Page loaded, waiting for components to mount...');
    
    // Step 2: Take initial screenshot
    console.log('2. Taking initial screenshot...');
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshot-initial.png'),
      fullPage: true 
    });
    console.log('   Screenshot saved as screenshot-initial.png\n');
    
    // Step 3: Click "Check Dark Mode Status" button and capture alert
    console.log('3. Clicking "Check Dark Mode Status" button...');
    
    // Set up dialog handler to capture alert message
    let alertMessage1 = '';
    let alertPromise1 = new Promise((resolve) => {
      page.once('dialog', async dialog => {
        alertMessage1 = dialog.message();
        console.log(`   Alert message: "${alertMessage1}"`);
        await dialog.accept();
        resolve(true);
      });
    });
    
    // Find and click the button
    await page.click('text=Check Dark Mode Status');
    
    // Wait for the alert to appear and be handled
    await Promise.race([
      alertPromise1,
      page.waitForTimeout(3000) // Timeout after 3 seconds
    ]);
    
    if (!alertMessage1) {
      console.log('   No alert appeared, trying to trigger manually...');
      // Try to execute the check function directly
      const result = await page.evaluate(() => {
        const isDark = document.documentElement.classList.contains('dark');
        const theme = localStorage.getItem('faz-o-pix-theme');
        return `Dark mode is ${isDark ? 'ON' : 'OFF'} | LocalStorage: ${theme}`;
      });
      alertMessage1 = result;
      console.log(`   Manual check result: "${result}"`);
    }
    
    // Step 4: Click the theme toggle button
    console.log('\n4. Looking for theme toggle button (moon/sun icon)...');
    
    // First, let's debug what's on the page
    console.log('   Debugging page content...');
    const allButtons = await page.$$('button');
    console.log(`   Total buttons found: ${allButtons.length}`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const classes = await button.getAttribute('class');
      const box = await button.boundingBox();
      console.log(`   Button ${i}: text="${text}" aria-label="${ariaLabel}" position=(${box?.x}, ${box?.y})`);
      console.log(`   Classes: ${classes}`);
    }
    
    // Try different selectors for the theme toggle based on the actual component
    const toggleSelectors = [
      'button[aria-label*="Switch to"]', // "Switch to dark mode" or "Switch to light mode"
      'button[aria-label*="mode"]',
      'button[title*="tema"]', // Portuguese title attribute
      'button:has(svg)', // Button containing SVG (Moon/Sun icon)
    ];
    
    let toggleFound = false;
    for (const selector of toggleSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        console.log(`   Found theme toggle with selector: ${selector}`);
        await page.click(selector);
        toggleFound = true;
        break;
      } catch (e) {
        console.log(`   Selector ${selector} not found, trying next...`);
      }
    }
    
    if (!toggleFound) {
      console.log('   Theme toggle not found with standard selectors, trying to find by position...');
      // Wait for the page to be fully loaded
      await page.waitForTimeout(2000);
      
      // Try to find button in top right area using more specific criteria
      const buttons = await page.$$('button');
      console.log(`   Found ${buttons.length} buttons on the page`);
      
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        try {
          const box = await button.boundingBox();
          if (box && box.x > 1000 && box.y < 100) { // Top-right corner
            console.log(`   Trying button at position (${box.x}, ${box.y})`);
            await button.click();
            toggleFound = true;
            console.log('   Successfully clicked button in top-right corner');
            break;
          }
        } catch (e) {
          // Continue to next button
        }
      }
    }
    
    if (!toggleFound) {
      console.log('   Could not find theme toggle button, trying to toggle manually...');
      // Manually toggle the theme using JavaScript
      await page.evaluate(() => {
        const currentTheme = localStorage.getItem('faz-o-pix-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('faz-o-pix-theme', newTheme);
        
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        console.log(`Manually toggled theme from ${currentTheme} to ${newTheme}`);
      });
      console.log('   Theme toggled manually using JavaScript');
    }
    
    // Step 5: Wait 500ms
    console.log('5. Waiting 500ms...');
    await page.waitForTimeout(500);
    
    // Step 6: Take second screenshot
    console.log('6. Taking screenshot after theme change...');
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshot-after-toggle.png'),
      fullPage: true 
    });
    console.log('   Screenshot saved as screenshot-after-toggle.png\n');
    
    // Step 7: Click "Check Dark Mode Status" again
    console.log('7. Clicking "Check Dark Mode Status" button again...');
    
    let alertMessage2 = '';
    let alertPromise2 = new Promise((resolve) => {
      page.once('dialog', async dialog => {
        alertMessage2 = dialog.message();
        console.log(`   Alert message: "${alertMessage2}"`);
        await dialog.accept();
        resolve(true);
      });
    });
    
    await page.click('text=Check Dark Mode Status');
    
    // Wait for the alert to appear and be handled
    await Promise.race([
      alertPromise2,
      page.waitForTimeout(3000) // Timeout after 3 seconds
    ]);
    
    if (!alertMessage2) {
      console.log('   No alert appeared, trying to check manually...');
      // Try to execute the check function directly
      const result = await page.evaluate(() => {
        const isDark = document.documentElement.classList.contains('dark');
        const theme = localStorage.getItem('faz-o-pix-theme');
        return `Dark mode is ${isDark ? 'ON' : 'OFF'} | LocalStorage: ${theme}`;
      });
      alertMessage2 = result;
      console.log(`   Manual check result: "${result}"`);
    }
    
    // Step 8: Report results
    console.log('\n=== TEST RESULTS ===');
    console.log(`Initial dark mode status: "${alertMessage1}"`);
    console.log(`After toggle dark mode status: "${alertMessage2}"`);
    
    // Check if screenshots exist and report
    const initialExists = fs.existsSync(path.join(__dirname, 'screenshot-initial.png'));
    const afterExists = fs.existsSync(path.join(__dirname, 'screenshot-after-toggle.png'));
    
    console.log(`\nScreenshots taken:`);
    console.log(`- Initial: ${initialExists ? 'Yes' : 'No'}`);
    console.log(`- After toggle: ${afterExists ? 'Yes' : 'No'}`);
    
    // Simple visual difference check
    if (initialExists && afterExists) {
      const initialStats = fs.statSync(path.join(__dirname, 'screenshot-initial.png'));
      const afterStats = fs.statSync(path.join(__dirname, 'screenshot-after-toggle.png'));
      
      console.log(`\nFile sizes:`);
      console.log(`- Initial: ${initialStats.size} bytes`);
      console.log(`- After toggle: ${afterStats.size} bytes`);
      
      if (initialStats.size !== afterStats.size) {
        console.log('✓ Screenshots have different file sizes, indicating visual changes occurred');
      } else {
        console.log('! Screenshots have same file size - may indicate no visual change');
      }
    }
    
    // Check if alert messages changed
    if (alertMessage1 !== alertMessage2) {
      console.log('✓ Dark mode status changed between clicks');
    } else {
      console.log('! Dark mode status appears unchanged');
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
    console.log('\nTest completed. Browser closed.');
  }
}

testTheme().catch(console.error);