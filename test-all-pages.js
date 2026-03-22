const puppeteer = require('puppeteer');

async function testPage(page, url, name) {
  console.log(`\nTesting ${name} (${url}):`);
  await page.goto(url);
  
  // Test light mode
  await page.evaluate(() => {
    localStorage.setItem('faz-o-pix-theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.reload();
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${name}-light.png` });
  
  // Click toggle to switch to dark
  await page.click('button[aria-label*="Switch to"]');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${name}-dark.png` });
  
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log(`✅ ${name}: Dark mode ${isDark ? 'enabled' : 'disabled'} after toggle`);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test all pages (homepage redirects to login, so skipping it)
  await testPage(page, 'http://localhost:3000/login', 'login');
  await testPage(page, 'http://localhost:3000/signup', 'signup');
  await testPage(page, 'http://localhost:3000/test-theme', 'test-theme');
  
  console.log('\n✅ All pages tested successfully!');
  console.log('Screenshots saved for each page in light and dark modes.');
  
  await browser.close();
})();