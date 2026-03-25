import { test, expect } from '@playwright/test';
import { uniqueEmail, signupUser, loginUser } from './helpers';

test.describe('Landing page', () => {
  test('deve mostrar titulo e link para cadastro', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Faz-o-Pix/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Cadastr|Comec|Criar|login|Entrar/i }).first()).toBeVisible();
  });

  test('deve ter texto em portugues', async ({ page }) => {
    await page.goto('/');
    const body = await page.textContent('body');
    // Should contain Portuguese text, not English
    expect(body).toMatch(/brasil|pix|conta|dividir|gratis/i);
  });
});

test.describe('Pagina de privacidade', () => {
  test('deve carregar e ter conteudo LGPD', async ({ page }) => {
    await page.goto('/privacidade');
    await expect(page.getByText(/LGPD|privacidade|dados|politica/i).first()).toBeVisible();
  });
});

test.describe('Bills page (autenticado)', () => {
  test('deve redirecionar para login se nao autenticado', async ({ page }) => {
    await page.goto('/bills');
    // Should either show login or redirect
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasLoginContent = await page.getByText(/Entrar|Login|Faca login/i).isVisible().catch(() => false);
    expect(url.includes('/login') || hasLoginContent).toBe(true);
  });

  test('deve mostrar lista de contas apos login', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await loginUser(page, email);

    await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });
    // Should see bills page content (list, empty state, or create button)
    await expect(
      page.getByText(/Minhas Contas|Nenhuma conta|Criar|contas|Nova/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe('API Health', () => {
  test('backend health check responde 200', async ({ request }) => {
    const response = await request.get('http://localhost:63292/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.services.database).toBe('connected');
  });

  test('API docs disponivel', async ({ request }) => {
    const response = await request.get('http://localhost:63292/docs');
    expect(response.status()).toBe(200);
  });
});
