const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,  // Show browser for visual verification
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  console.log('Opening login page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  
  // Wait a moment for React to render
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if dark mode button exists
  const buttonExists = await page.$('button[aria-label*="Switch to"]') !== null;
  console.log('Dark mode button exists:', buttonExists);
  
  if (buttonExists) {
    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    console.log('Initial theme:', initialTheme);
    
    // Click the toggle
    await page.click('button[aria-label*="Switch to"]');
    await new Promise(r => setTimeout(r, 1000));
    
    // Get theme after toggle
    const afterTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    console.log('Theme after toggle:', afterTheme);
    
    console.log('✅ Dark mode is', initialTheme !== afterTheme ? 'WORKING!' : 'NOT working');
  } else {
    // Try to find any button to debug
    const allButtons = await page.$$eval('button', buttons => 
      buttons.map(b => ({ text: b.textContent, classes: b.className }))
    );
    console.log('All buttons found:', allButtons);
  }
  
  console.log('\nKeeping browser open for 10 seconds so you can see the result...');
  await new Promise(r => setTimeout(r, 10000));
  
  await browser.close();
})();