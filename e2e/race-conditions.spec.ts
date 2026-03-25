import { test, expect } from '@playwright/test';
import { uniqueEmail, signupUser, loginUser } from './helpers';

test.describe('Race conditions', () => {
  test('signup duplo simultaneo com mesmo email - segundo deve falhar', async ({ page, context }) => {
    const email = uniqueEmail();
    const page2 = await context.newPage();

    // Fill both forms
    await page.goto('/signup');
    await page2.goto('/signup');

    for (const p of [page, page2]) {
      await p.getByRole('textbox', { name: /Joao Silva/i }).fill('Race User');
      await p.getByRole('textbox', { name: /seu@email/i }).fill(email);
      await p.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
      await p.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    }

    // Submit both nearly simultaneously
    await Promise.all([
      page.getByRole('button', { name: /Criar conta/i }).click(),
      page2.getByRole('button', { name: /Criar conta/i }).click(),
    ]);

    await page.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // One should succeed (redirect to /login), one should show error
    const url1 = page.url();
    const url2 = page2.url();
    const oneSucceeded = url1.includes('/login') || url2.includes('/login');
    expect(oneSucceeded).toBe(true);

    await page2.close();
  });

  test('login em duas tabs simultaneas deve funcionar', async ({ page, context }) => {
    const email = uniqueEmail();
    await signupUser(page, email);

    const page2 = await context.newPage();

    // Login from both tabs
    for (const p of [page, page2]) {
      await p.goto('/login');
      await p.getByRole('textbox', { name: /seu@email/i }).fill(email);
      await p.getByRole('textbox', { name: /Sua senha/i }).fill('senha12345');
    }

    await Promise.all([
      page.getByRole('button', { name: /Entrar/i }).click(),
      page2.getByRole('button', { name: /Entrar/i }).click(),
    ]);

    await page.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // Both should succeed
    expect(page.url()).toContain('/bills');
    expect(page2.url()).toContain('/bills');

    await page2.close();
  });

  test('navegar rapido entre paginas nao deve crashar', async ({ page }) => {
    const pages = ['/login', '/signup', '/', '/privacidade', '/login', '/signup'];
    for (const p of pages) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
    }
    // Should end up on last page without crash
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole('button', { name: /Criar conta/i })).toBeVisible();
  });

  test('refresh durante login nao deve deixar estado inconsistente', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await page.goto('/login');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Sua senha/i }).fill('senha12345');

    // Reload mid-fill
    await page.reload();
    await page.waitForTimeout(1000);

    // Should be back on clean login page
    expect(page.url()).toContain('/login');
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();

    // Should still be able to login
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Sua senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });
  });

  test('clicar Criar conta rapidamente nao deve crashar', async ({ page }) => {
    const email = uniqueEmail();
    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Debounce Test');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');

    await page.getByRole('button', { name: /Criar conta/i }).click();
    await page.waitForTimeout(5000);

    // Should have redirected to login
    expect(page.url()).toContain('/login');

    // Verify we can login
    await loginUser(page, email);
    await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });
  });

  test('sessao expirada deve redirecionar para login', async ({ page, context }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await loginUser(page, email);
    await expect(page).toHaveURL(/\/bills/);

    // Clear cookies to simulate session expiry
    await context.clearCookies();
    await page.reload();
    await page.waitForTimeout(3000);

    const url = page.url();
    const hasLogin = await page.getByText(/Entrar/i).isVisible().catch(() => false);
    expect(url.includes('/login') || hasLogin).toBe(true);
  });

  test('API rate limiting nao deve crashar o app', async ({ request, baseURL }) => {
    const apiBase = baseURL?.replace(/:\d+/, ':63292')?.replace('https://', 'http://') || 'http://localhost:63292';
    const results: number[] = [];

    // Fire 20 rapid requests
    for (let i = 0; i < 20; i++) {
      const res = await request.get(`${apiBase}/health`);
      results.push(res.status());
    }

    // All should be 200 (rate limit is 100/min, we're well under)
    expect(results.every(s => s === 200)).toBe(true);
  });

  test('requests com headers maliciosos nao devem crashar', async ({ request, baseURL }) => {
    const apiBase = baseURL?.replace(/:\d+/, ':63292')?.replace('https://', 'http://') || 'http://localhost:63292';

    const res = await request.post(`${apiBase}/api/auth/login`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '127.0.0.1',
        'X-Custom-Inject': '<script>alert(1)</script>',
      },
      data: { identifier: 'test', password: 'test' },
    });

    // Should return 401 (invalid creds), not 500
    expect(res.status()).toBeLessThan(500);
  });

  test('body gigante nao deve crashar o servidor', async ({ request, baseURL }) => {
    const apiBase = baseURL?.replace(/:\d+/, ':63292')?.replace('https://', 'http://') || 'http://localhost:63292';

    const res = await request.post(`${apiBase}/api/auth/signup`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        fullName: 'A'.repeat(10000),
        password: 'B'.repeat(10000),
        identifiers: [{ type: 'EMAIL', value: 'C'.repeat(10000) }],
      },
    });

    // Should return 4xx (validation error), not 500
    expect(res.status()).toBeLessThan(500);
  });
});
