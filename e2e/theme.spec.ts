import { test, expect } from '@playwright/test';

async function gotoDark(page: import('@playwright/test').Page, path: string) {
  // Set dark mode in localStorage BEFORE navigating so ThemeToggle picks it up on mount
  await page.goto(path);
  await page.evaluate(() => {
    localStorage.setItem('fazopix-theme', 'dark');
  });
  await page.reload();
  await page.waitForTimeout(500);
}

test.describe('Tema (Dark/Light mode)', () => {
  test('signup deve ter toggle de tema visivel', async ({ page }) => {
    await page.goto('/signup');
    const toggle = page.getByRole('button', { name: /modo (escuro|claro)/i });
    await expect(toggle).toBeVisible();
  });

  test('login deve ter toggle de tema visivel', async ({ page }) => {
    await page.goto('/login');
    const toggle = page.getByRole('button', { name: /modo (escuro|claro)/i });
    await expect(toggle).toBeVisible();
  });

  test('toggle deve alternar classe dark no html', async ({ page }) => {
    await page.goto('/signup');
    const html = page.locator('html');

    await page.getByRole('button', { name: /modo (escuro|claro)/i }).click();
    const class1 = await html.getAttribute('class');
    await page.getByRole('button', { name: /modo (escuro|claro)/i }).click();
    const class2 = await html.getAttribute('class');

    expect(class1?.includes('dark')).not.toBe(class2?.includes('dark'));
  });

  test('dark mode: labels devem ter cor clara na signup', async ({ page }) => {
    await gotoDark(page, '/signup');

    const labels = page.locator('label');
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const label = labels.nth(i);
      const color = await label.evaluate(el => getComputedStyle(el).color);
      const rgb = color.match(/\d+/g)?.map(Number) || [];
      const isLight = rgb.length >= 3 && rgb.slice(0, 3).every(v => v > 150);
      expect(isLight, `Label ${i} color ${color} should be light in dark mode`).toBe(true);
    }
  });

  test('dark mode: labels devem ter cor clara na login', async ({ page }) => {
    await gotoDark(page, '/login');

    const labels = page.locator('label');
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const label = labels.nth(i);
      const color = await label.evaluate(el => getComputedStyle(el).color);
      const rgb = color.match(/\d+/g)?.map(Number) || [];
      const isLight = rgb.length >= 3 && rgb.slice(0, 3).every(v => v > 150);
      expect(isLight, `Label ${i} color ${color} should be light in dark mode`).toBe(true);
    }
  });

  test('dark mode: LGPD notice deve ser legivel na signup', async ({ page }) => {
    await gotoDark(page, '/signup');

    const lgpdStrong = page.locator('strong').filter({ hasText: /LGPD/ });
    await expect(lgpdStrong).toBeVisible();

    const color = await lgpdStrong.evaluate(el => {
      const parent = el.closest('p');
      return getComputedStyle(parent || el).color;
    });
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 100);
    expect(isReadable, `LGPD text color ${color} should be readable in dark mode`).toBe(true);
  });

  test('dark mode: footer text deve ser legivel na signup', async ({ page }) => {
    await gotoDark(page, '/signup');

    const footer = page.getByText(/Ja tem conta/);
    await expect(footer).toBeVisible();

    const color = await footer.evaluate(el => getComputedStyle(el).color);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).every(v => v > 120);
    expect(isReadable, `Footer text color ${color} should be readable in dark mode`).toBe(true);
  });

  test('dark mode: footer text deve ser legivel na login', async ({ page }) => {
    await gotoDark(page, '/login');

    const footer = page.getByText(/Nao tem conta/);
    await expect(footer).toBeVisible();

    const color = await footer.evaluate(el => getComputedStyle(el).color);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).every(v => v > 120);
    expect(isReadable, `Footer text color ${color} should be readable in dark mode`).toBe(true);
  });

  test('light mode: inputs devem ter texto escuro', async ({ page }) => {
    await page.goto('/signup');
    await page.evaluate(() => {
      localStorage.setItem('fazopix-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(300);

    const input = page.getByRole('textbox', { name: /Joao Silva/i });
    await input.fill('Teste');

    const color = await input.evaluate(el => getComputedStyle(el).color);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isDark = rgb.length >= 3 && rgb.slice(0, 3).every(v => v < 100);
    expect(isDark, `Input text ${color} should be dark in light mode`).toBe(true);
  });
});
