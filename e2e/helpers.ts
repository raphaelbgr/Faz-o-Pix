import { Page } from '@playwright/test';

const API = 'http://localhost:63292/api';
let userCounter = 0;

export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${++userCounter}@teste.com`;
}

export async function signupUser(page: Page, email: string, password = 'senha12345') {
  await page.goto('/signup');
  await page.getByRole('textbox', { name: /Joao Silva/i }).fill('E2E Teste');
  await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
  await page.getByRole('textbox', { name: /Minimo 8/i }).fill(password);
  await page.getByRole('textbox', { name: /Digite a senha/i }).fill(password);
  await page.getByRole('button', { name: /Criar conta/i }).click();
  await page.waitForURL('**/login', { timeout: 10000 });
}

export async function loginUser(page: Page, email: string, password = 'senha12345') {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
  await page.getByRole('textbox', { name: /Sua senha/i }).fill(password);
  await page.getByRole('button', { name: /Entrar/i }).click();
  await page.waitForURL('**/bills', { timeout: 10000 });
}

export async function cleanupUser(email: string) {
  // Delete user via direct DB if needed — for now just let tests use unique emails
}
