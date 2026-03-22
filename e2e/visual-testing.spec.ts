import { test, expect } from '@playwright/test';

test.describe('Visual Design Testing', () => {
  test('Homepage - Light Theme', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-light.png');
  });

  test('Homepage - Dark Theme', async ({ page }) => {
    await page.goto('/');
    // Toggle dark theme if available
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
    }
    await expect(page).toHaveScreenshot('homepage-dark.png');
  });

  test('Login Page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login-page.png');
  });

  test('Signup Page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveScreenshot('signup-page.png');
  });

  test('Mobile - Homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });

  test('Component States - Form Validation', async ({ page }) => {
    await page.goto('/login');
    
    // Test empty form validation
    await page.click('button[type="submit"]');
    await expect(page).toHaveScreenshot('login-validation-errors.png');
  });
});