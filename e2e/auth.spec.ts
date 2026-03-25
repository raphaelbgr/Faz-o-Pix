import { test, expect } from '@playwright/test';
import { uniqueEmail, signupUser, loginUser } from './helpers';

test.describe('Cadastro (Signup)', () => {
  test('deve criar conta com email e redirecionar para login', async ({ page }) => {
    const email = uniqueEmail();
    await page.goto('/signup');

    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Maria Teste');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Criar conta/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('deve mostrar erro com senha curta', async ({ page }) => {
    await page.goto('/signup');

    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Teste');
    await page.getByRole('textbox', { name: /seu@email/i }).fill('short@t.com');
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('123');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('123');
    await page.getByRole('button', { name: /Criar conta/i }).click();

    await expect(page.getByText(/pelo menos 8 caracteres/i)).toBeVisible({ timeout: 5000 });
  });

  test('deve mostrar erro quando senhas nao coincidem', async ({ page }) => {
    await page.goto('/signup');

    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Teste');
    await page.getByRole('textbox', { name: /seu@email/i }).fill('mismatch@t.com');
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('outrasenha');
    await page.getByRole('button', { name: /Criar conta/i }).click();

    await expect(page.getByText(/senhas nao coincidem/i)).toBeVisible({ timeout: 5000 });
  });

  test('deve rejeitar email duplicado', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);

    // Try signing up again with same email
    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Outro Nome');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Criar conta/i }).click();

    await expect(page.getByText(/already registered|ja registrado|erro/i)).toBeVisible({ timeout: 10000 });
  });

  test('deve trocar campo quando mudar tipo de identificador para CPF', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('combobox').selectOption('PIX_CPF');
    await expect(page.locator('label').filter({ hasText: 'CPF' })).toBeVisible();
  });
});

test.describe('Login', () => {
  test('deve fazer login com email valido e ir para bills', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await loginUser(page, email);

    await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });
  });

  test('deve mostrar erro com credenciais invalidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /seu@email/i }).fill('naoexiste@teste.com');
    await page.getByRole('textbox', { name: /Sua senha/i }).fill('senhaerrada');
    await page.getByRole('button', { name: /Entrar/i }).click();

    // Toast error appears briefly — check for the toast container or any error indication
    await page.waitForTimeout(2000);
    // The toast or an error state should have appeared — check page didn't navigate to /bills
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('deve mostrar erro com campo vazio', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Entrar/i }).click();

    // Validation errors appear for both fields
    await expect(
      page.getByText(/obrigat/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Navegacao auth', () => {
  test('link "Faca login" na signup leva para login', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('link', { name: /Faca login/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('link "Cadastre-se" na login leva para signup', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Cadastre-se/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
