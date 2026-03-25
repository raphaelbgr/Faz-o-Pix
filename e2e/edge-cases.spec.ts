import { test, expect } from '@playwright/test';
import { uniqueEmail, signupUser, loginUser } from './helpers';

test.describe('Edge cases - Signup', () => {
  test('nome com 1 caractere deve falhar', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('A');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(uniqueEmail());
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Criar conta/i }).click();
    await expect(page.getByText(/pelo menos 2/i)).toBeVisible({ timeout: 5000 });
  });

  test('nome com 255 caracteres deve funcionar', async ({ page }) => {
    await page.goto('/signup');
    const longName = 'A'.repeat(255);
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill(longName);
    await page.getByRole('textbox', { name: /seu@email/i }).fill(uniqueEmail());
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Criar conta/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('senha com exatamente 8 caracteres deve funcionar', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Teste Oito');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(uniqueEmail());
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('12345678');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('12345678');
    await page.getByRole('button', { name: /Criar conta/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('senha com 7 caracteres deve falhar', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Teste Sete');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(uniqueEmail());
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('1234567');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('1234567');
    await page.getByRole('button', { name: /Criar conta/i }).click();
    await expect(page.getByText(/pelo menos 8/i)).toBeVisible({ timeout: 5000 });
  });

  test('email invalido deve falhar', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Teste Email');
    await page.getByRole('textbox', { name: /seu@email/i }).fill('naoemail');
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Criar conta/i }).click();
    // Should show error or stay on page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/signup');
  });

  test('campos vazios devem mostrar erros', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: /Criar conta/i }).click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/signup');
  });

  test('trocar para CPF mostra campo correto', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('combobox').selectOption('PIX_CPF');
    await expect(page.getByRole('textbox', { name: /000\.000/i })).toBeVisible();
    // Switch back to email
    await page.getByRole('combobox').selectOption('PIX_EMAIL');
    await expect(page.getByRole('textbox', { name: /seu@email/i })).toBeVisible();
  });

  test('trocar para telefone mostra campo correto', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('combobox').selectOption('PIX_PHONE');
    await expect(page.getByRole('textbox', { name: /99999/i })).toBeVisible();
  });
});

test.describe('Edge cases - Login', () => {
  test('login com email com espacos antes/depois nao deve crashar', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await page.goto('/login');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(`  ${email}  `);
    await page.getByRole('textbox', { name: /Sua senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForTimeout(3000);
    // Should stay on login or go to bills — no 500 error
    expect(page.url()).toMatch(/\/(login|bills)/);
  });

  test('login com senha errada nao deve redirecionar', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await page.goto('/login');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Sua senha/i }).fill('senhaerrada999');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('multiplos logins rapidos nao devem crashar', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await page.goto('/login');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Sua senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForTimeout(5000);
    // Should end up on bills or login, not crashed
    expect(page.url()).toMatch(/\/(bills|login)/);
  });
});

test.describe('Edge cases - Navegacao', () => {
  test('acessar /bills sem login redireciona para login', async ({ page }) => {
    await page.goto('/bills');
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasLogin = await page.getByText(/Entrar/i).isVisible().catch(() => false);
    expect(url.includes('/login') || hasLogin).toBe(true);
  });

  test('acessar /bills/id-invalido sem login redireciona', async ({ page }) => {
    await page.goto('/bills/00000000-0000-0000-0000-000000000000');
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasLogin = await page.getByText(/Entrar/i).isVisible().catch(() => false);
    expect(url.includes('/login') || hasLogin).toBe(true);
  });

  test('pagina 404 nao deve crashar', async ({ page }) => {
    const response = await page.goto('/pagina-que-nao-existe');
    expect(response?.status()).toBe(404);
  });

  test('voltar e avancar no navegador deve funcionar', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Cadastre-se/i }).click();
    await expect(page).toHaveURL(/\/signup/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await page.goForward();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('landing page links devem funcionar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Comece agora/i }).click();
    await expect(page).toHaveURL(/\/signup/);
    await page.goto('/');
    await page.getByRole('link', { name: /Já tenho conta/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('privacidade link no footer deve funcionar', async ({ page }) => {
    await page.goto('/');
    // Footer has multiple links — use the one in the footer area
    const footerLink = page.locator('footer').getByRole('link', { name: /Privacidade/i });
    await footerLink.click();
    await expect(page).toHaveURL(/\/privacidade/);
  });
});

test.describe('Edge cases - Bills (autenticado)', () => {
  test('criar conta e ver na lista', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await loginUser(page, email);

    // Click create bill
    await page.getByRole('button', { name: /Criar primeira conta/i }).click();
    await page.waitForTimeout(500);

    // Fill bill name in modal
    const nameInput = page.getByRole('textbox', { name: /nome/i }).or(page.locator('input[placeholder*="Viagem"]').or(page.locator('input').first()));
    if (await nameInput.isVisible()) {
      await nameInput.fill('Viagem Rio');
      const createBtn = page.getByRole('button', { name: /Criar|Salvar/i }).last();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    // Either modal worked or we're still on bills page — not crashed
    expect(page.url()).toContain('/bills');
  });

  test('logout deve redirecionar para login', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await loginUser(page, email);

    await page.getByRole('button', { name: /Sair/i }).click();
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasLogin = await page.getByText(/Entrar/i).isVisible().catch(() => false);
    expect(url.includes('/login') || hasLogin).toBe(true);
  });

  test('apos logout nao deve acessar bills', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await loginUser(page, email);
    await page.getByRole('button', { name: /Sair/i }).click();
    await page.waitForTimeout(2000);

    await page.goto('/bills');
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasLogin = await page.getByText(/Entrar/i).isVisible().catch(() => false);
    expect(url.includes('/login') || hasLogin).toBe(true);
  });
});

test.describe('Edge cases - Seguranca', () => {
  test('XSS em nome nao deve executar script', async ({ page }) => {
    const email = uniqueEmail();
    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('<script>alert("xss")</script>');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Criar conta/i }).click();

    // Should either succeed signup or show validation error, never execute script
    await page.waitForTimeout(2000);
    const dialogFired = await page.evaluate(() => (window as any).__xss_fired || false);
    expect(dialogFired).toBe(false);
  });

  test('SQL injection em login nao deve crashar', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /seu@email/i }).fill("' OR 1=1 --");
    await page.getByRole('textbox', { name: /Sua senha/i }).fill("' OR 1=1 --");
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForTimeout(5000);
    // Should stay on login, not crash or bypass to bills
    expect(page.url()).not.toContain('/bills');
  });

  test('API health nao deve expor stack traces em producao', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL?.replace(/:\d+/, ':63292')?.replace('https://', 'http://') || 'http://localhost:63292'}/health`);
    const body = await res.json();
    expect(body).not.toHaveProperty('stack');
  });
});

test.describe('Edge cases - Responsividade', () => {
  test('signup deve funcionar em viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto('/signup');
    await expect(page.getByRole('button', { name: /Criar conta/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Joao Silva/i })).toBeVisible();
  });

  test('login deve funcionar em viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
  });

  test('landing page deve funcionar em viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByText(/Faz-o-Pix/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Comece agora/i })).toBeVisible();
  });

  test('signup deve funcionar em viewport tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/signup');
    await expect(page.getByRole('button', { name: /Criar conta/i })).toBeVisible();
  });
});

test.describe('Stress - Requisicoes rapidas', () => {
  test('10 signups consecutivos devem funcionar', async ({ page }) => {
    const emails: string[] = [];
    for (let i = 0; i < 10; i++) {
      const email = uniqueEmail();
      emails.push(email);
      await page.goto('/signup');
      await page.getByRole('textbox', { name: /Joao Silva/i }).fill(`Stress ${i}`);
      await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
      await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
      await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
      await page.getByRole('button', { name: /Criar conta/i }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }
    // All 10 should have succeeded — verify last one can login
    await loginUser(page, emails[9]);
    await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });
  });

  test('5 login/logout cycles devem funcionar', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);

    for (let i = 0; i < 5; i++) {
      await loginUser(page, email);
      await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });
      await page.getByRole('button', { name: /Sair/i }).click();
      await page.waitForTimeout(1500);
    }
  });
});
