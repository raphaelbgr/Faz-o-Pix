import { test, expect, Page } from '@playwright/test';
import { uniqueEmail, signupUser, loginUser } from './helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to a page in dark mode (set localStorage, reload, wait for theme). */
async function gotoDark(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => localStorage.setItem('fazopix-theme', 'dark'));
  await page.reload();
  await page.waitForTimeout(500);
}

/** Navigate to a page in explicit light mode. */
async function gotoLight(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => {
    localStorage.setItem('fazopix-theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.reload();
  await page.waitForTimeout(500);
}

/**
 * Assert that a computed text color is "light" (readable on a dark background).
 * At least one RGB channel must be > 150.
 */
function expectLightColor(color: string, context: string) {
  const rgb = color.match(/\d+/g)?.map(Number) || [];
  const isLight = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 150);
  expect(isLight, `${context}: color ${color} should be light in dark mode`).toBe(true);
}

/**
 * Assert that a computed text color is "dark" (readable on a light background).
 * All RGB channels must be < 100.
 */
function expectDarkColor(color: string, context: string) {
  const rgb = color.match(/\d+/g)?.map(Number) || [];
  const isDark = rgb.length >= 3 && rgb.slice(0, 3).every(v => v < 100);
  expect(isDark, `${context}: color ${color} should be dark in light mode`).toBe(true);
}

/** Get computed color of a locator element. */
async function getColor(locator: ReturnType<Page['locator']>): Promise<string> {
  return locator.evaluate(el => getComputedStyle(el).color);
}

/** Get computed color of the first matching element by text. */
async function getTextColor(page: Page, text: string | RegExp): Promise<string> {
  return page.getByText(text).first().evaluate(el => getComputedStyle(el).color);
}

// ---------------------------------------------------------------------------
// Landing page (/) — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Landing page (/) dark mode', () => {
  test('dark: h1 "Divida contas facilmente" deve ter texto claro', async ({ page }) => {
    await gotoDark(page, '/');
    const color = await getColor(page.locator('h1').first());
    expectLightColor(color, 'Landing h1');
  });

  test('dark: paragrafo hero deve ter texto claro', async ({ page }) => {
    await gotoDark(page, '/');
    const color = await getTextColor(page, /Organize gastos de viagens/);
    expectLightColor(color, 'Landing hero paragraph');
  });

  test('dark: titulos dos feature cards devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/');
    const headings = page.locator('h3').filter({ hasText: /(Grupos flex|inteligente|Pague com Pix)/ });
    const count = await headings.count();
    expect(count).toBe(3);
    for (let i = 0; i < count; i++) {
      const color = await getColor(headings.nth(i));
      expectLightColor(color, `Feature card heading ${i}`);
    }
  });

  test('dark: descricoes dos feature cards devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/');
    const descs = [
      /Adicione participantes por CPF/,
      /Divida igualmente, por porcentagem/,
      /Gere c.digo Pix copia-e-cola/,
    ];
    for (const desc of descs) {
      const color = await getTextColor(page, desc);
      const rgb = color.match(/\d+/g)?.map(Number) || [];
      const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
      expect(isReadable, `Feature desc matching ${desc}: color ${color} should be readable in dark mode`).toBe(true);
    }
  });

  test('dark: "Como funciona" titulo e step titles devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/');
    // Section heading
    const h2Color = await getTextColor(page, /Como funciona/);
    expectLightColor(h2Color, 'Como funciona h2');

    // Step titles
    const stepTitles = ['Crie uma conta', 'Registre gastos', 'Veja os saldos', 'Pague via Pix'];
    for (const title of stepTitles) {
      const color = await getTextColor(page, title);
      expectLightColor(color, `Step title "${title}"`);
    }
  });

  test('dark: secao "Seguro e privado" deve ter texto claro', async ({ page }) => {
    await gotoDark(page, '/');
    const h2Color = await getTextColor(page, /Seguro e privado/);
    expectLightColor(h2Color, 'Security section h2');

    const pColor = await getTextColor(page, /Senhas protegidas com Argon2id/);
    const rgb = pColor.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Security paragraph color ${pColor} should be readable in dark mode`).toBe(true);
  });

  test('dark: footer deve ter texto claro', async ({ page }) => {
    await gotoDark(page, '/');
    const footerColor = await getTextColor(page, /Feito no Brasil/);
    const rgb = footerColor.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Footer text color ${footerColor} should be readable in dark mode`).toBe(true);
  });

  test('dark: links de navegacao devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/');
    // "Entrar" nav link
    const entrarLink = page.locator('nav a').filter({ hasText: 'Entrar' });
    const color = await getColor(entrarLink);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Nav link "Entrar" color ${color} should be readable in dark mode`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Landing page (/) — Light Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Landing page (/) light mode', () => {
  test('light: h1 "Divida contas facilmente" deve ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/');
    const color = await getColor(page.locator('h1').first());
    expectDarkColor(color, 'Landing h1 light');
  });

  test('light: feature card headings devem ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/');
    const headings = page.locator('h3').filter({ hasText: /(Grupos flex|inteligente|Pague com Pix)/ });
    const count = await headings.count();
    expect(count).toBe(3);
    for (let i = 0; i < count; i++) {
      const color = await getColor(headings.nth(i));
      expectDarkColor(color, `Feature card heading ${i} light`);
    }
  });

  test('light: "Como funciona" titulo deve ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/');
    const color = await getTextColor(page, /Como funciona/);
    expectDarkColor(color, 'Como funciona h2 light');
  });
});

// ---------------------------------------------------------------------------
// Login (/login) — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Login (/login) dark mode', () => {
  test('dark: h1 "Faz-o-Pix" e h2 "Entrar" devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/login');
    const h1Color = await getColor(page.locator('h1').first());
    expectLightColor(h1Color, 'Login h1 "Faz-o-Pix"');

    const h2Color = await getColor(page.locator('h2').first());
    expectLightColor(h2Color, 'Login h2 "Entrar"');
  });

  test('dark: labels do formulario devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/login');
    const labels = page.locator('label');
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const color = await getColor(labels.nth(i));
      expectLightColor(color, `Login label ${i}`);
    }
  });

  test('dark: LGPD notice deve ser legivel', async ({ page }) => {
    await gotoDark(page, '/login');
    const lgpdColor = await getTextColor(page, /100% seguro e conforme LGPD/);
    const rgb = lgpdColor.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 100);
    expect(isReadable, `Login LGPD notice color ${lgpdColor} should be readable in dark mode`).toBe(true);
  });

  test('dark: footer "Nao tem conta?" e link "Cadastre-se" devem ser legiveis', async ({ page }) => {
    await gotoDark(page, '/login');
    const footerColor = await getTextColor(page, /Nao tem conta/);
    const rgb = footerColor.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Login footer color ${footerColor} should be readable in dark mode`).toBe(true);

    const linkColor = await getColor(page.getByRole('link', { name: /Cadastre-se/ }));
    const linkRgb = linkColor.match(/\d+/g)?.map(Number) || [];
    const linkReadable = linkRgb.length >= 3 && linkRgb.slice(0, 3).some(v => v > 80);
    expect(linkReadable, `Login "Cadastre-se" link color ${linkColor} should be readable in dark mode`).toBe(true);
  });

  test('dark: divider "ou continue com" deve ter texto claro', async ({ page }) => {
    await gotoDark(page, '/login');
    const color = await getTextColor(page, /ou continue com/);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Login divider color ${color} should be readable in dark mode`).toBe(true);
  });

  test('dark: OAuth buttons "Google", "Apple" e "Em breve" badges devem ser legiveis', async ({ page }) => {
    await gotoDark(page, '/login');

    // OAuth button text
    const googleText = page.locator('button:disabled').filter({ hasText: 'Google' }).locator('span').filter({ hasText: 'Google' });
    const googleColor = await getColor(googleText);
    const gRgb = googleColor.match(/\d+/g)?.map(Number) || [];
    // Disabled buttons have muted text — just check it is not pure black (which would be invisible on dark bg)
    const googleReadable = gRgb.length >= 3 && gRgb.slice(0, 3).some(v => v > 80);
    expect(googleReadable, `Google button text color ${googleColor} should be somewhat readable in dark mode`).toBe(true);

    const appleText = page.locator('button:disabled').filter({ hasText: 'Apple' }).locator('span').filter({ hasText: 'Apple' });
    const appleColor = await getColor(appleText);
    const aRgb = appleColor.match(/\d+/g)?.map(Number) || [];
    const appleReadable = aRgb.length >= 3 && aRgb.slice(0, 3).some(v => v > 80);
    expect(appleReadable, `Apple button text color ${appleColor} should be somewhat readable in dark mode`).toBe(true);

    // "Em breve" badges
    const badges = page.getByText('Em breve');
    const badgeCount = await badges.count();
    expect(badgeCount).toBe(2);
    for (let i = 0; i < badgeCount; i++) {
      const badgeColor = await getColor(badges.nth(i));
      const bRgb = badgeColor.match(/\d+/g)?.map(Number) || [];
      const badgeReadable = bRgb.length >= 3 && bRgb.slice(0, 3).some(v => v > 80);
      expect(badgeReadable, `"Em breve" badge ${i} color ${badgeColor} should be readable in dark mode`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Login (/login) — Light Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Login (/login) light mode', () => {
  test('light: h1 e h2 devem ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/login');
    const h1Color = await getColor(page.locator('h1').first());
    expectDarkColor(h1Color, 'Login h1 light');

    const h2Color = await getColor(page.locator('h2').first());
    expectDarkColor(h2Color, 'Login h2 light');
  });

  test('light: labels devem ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/login');
    const labels = page.locator('label');
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const color = await getColor(labels.nth(i));
      expectDarkColor(color, `Login label ${i} light`);
    }
  });
});

// ---------------------------------------------------------------------------
// Signup (/signup) — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Signup (/signup) dark mode', () => {
  test('dark: h1 "Faz-o-Pix" e subtitulo "Crie sua conta gratuita" devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/signup');
    const h1Color = await getColor(page.locator('h1').first());
    expectLightColor(h1Color, 'Signup h1');

    const subColor = await getTextColor(page, /Crie sua conta gratuita/);
    const rgb = subColor.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Signup subtitle color ${subColor} should be readable in dark mode`).toBe(true);
  });

  test('dark: todos os labels do formulario devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/signup');
    const labels = page.locator('label');
    const count = await labels.count();
    expect(count).toBeGreaterThanOrEqual(4); // Name, identifier type, identifier value, password, confirm
    for (let i = 0; i < count; i++) {
      const color = await getColor(labels.nth(i));
      expectLightColor(color, `Signup label ${i}`);
    }
  });

  test('dark: LGPD notice box deve ser legivel', async ({ page }) => {
    await gotoDark(page, '/signup');
    const lgpdColor = await getTextColor(page, /100% conforme LGPD/);
    const rgb = lgpdColor.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 100);
    expect(isReadable, `Signup LGPD notice color ${lgpdColor} should be readable in dark mode`).toBe(true);
  });

  test('dark: divider "ou cadastre-se com" deve ter texto claro', async ({ page }) => {
    await gotoDark(page, '/signup');
    const color = await getTextColor(page, /ou cadastre-se com/);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Signup divider color ${color} should be readable in dark mode`).toBe(true);
  });

  test('dark: OAuth buttons e badges devem ser legiveis', async ({ page }) => {
    await gotoDark(page, '/signup');
    const badges = page.getByText('Em breve');
    const badgeCount = await badges.count();
    expect(badgeCount).toBe(2);
    for (let i = 0; i < badgeCount; i++) {
      const badgeColor = await getColor(badges.nth(i));
      const bRgb = badgeColor.match(/\d+/g)?.map(Number) || [];
      const badgeReadable = bRgb.length >= 3 && bRgb.slice(0, 3).some(v => v > 80);
      expect(badgeReadable, `Signup "Em breve" badge ${i} color ${badgeColor} should be readable in dark mode`).toBe(true);
    }
  });

  test('dark: footer "Ja tem conta?" deve ser legivel', async ({ page }) => {
    await gotoDark(page, '/signup');
    const color = await getTextColor(page, /Ja tem conta/);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Signup footer color ${color} should be readable in dark mode`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Signup (/signup) — Light Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Signup (/signup) light mode', () => {
  test('light: h1 e labels devem ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/signup');
    const h1Color = await getColor(page.locator('h1').first());
    expectDarkColor(h1Color, 'Signup h1 light');

    const labels = page.locator('label');
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const color = await getColor(labels.nth(i));
      expectDarkColor(color, `Signup label ${i} light`);
    }
  });

  test('light: footer "Ja tem conta?" deve ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/signup');
    const color = await getTextColor(page, /Ja tem conta/);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isDark = rgb.length >= 3 && rgb.slice(0, 3).every(v => v < 130);
    expect(isDark, `Signup footer color ${color} should be dark-ish in light mode`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bills (/bills) — Requires auth — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Bills (/bills) dark mode', () => {
  let email: string;

  test.beforeAll(async ({ browser }) => {
    email = uniqueEmail();
    const page = await browser.newPage();
    await signupUser(page, email);
    await page.close();
  });

  test('dark: h1 "Faz-o-Pix" header deve ter texto claro', async ({ page }) => {
    await loginUser(page, email);
    await page.evaluate(() => localStorage.setItem('fazopix-theme', 'dark'));
    await page.reload();
    await page.waitForTimeout(500);

    const h1Color = await getColor(page.locator('h1').first());
    expectLightColor(h1Color, 'Bills h1');
  });

  test('dark: subtitulo "Suas contas compartilhadas" deve ser legivel', async ({ page }) => {
    await loginUser(page, email);
    await page.evaluate(() => localStorage.setItem('fazopix-theme', 'dark'));
    await page.reload();
    await page.waitForTimeout(500);

    const color = await getTextColor(page, /Suas contas compartilhadas/);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 100);
    expect(isReadable, `Bills subtitle color ${color} should be readable in dark mode`).toBe(true);
  });

  test('dark: LGPD badge deve ser legivel', async ({ page }) => {
    await loginUser(page, email);
    await page.evaluate(() => localStorage.setItem('fazopix-theme', 'dark'));
    await page.reload();
    await page.waitForTimeout(500);

    const color = await getTextColor(page, /Protegido pela LGPD/);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 60);
    expect(isReadable, `Bills LGPD badge color ${color} should be readable in dark mode`).toBe(true);
  });

  test('dark: empty state "Nenhuma conta encontrada" deve ter texto claro', async ({ page }) => {
    await loginUser(page, email);
    await page.evaluate(() => localStorage.setItem('fazopix-theme', 'dark'));
    await page.reload();
    await page.waitForTimeout(500);

    const color = await getTextColor(page, /Nenhuma conta encontrada/);
    expectLightColor(color, 'Bills empty state heading');
  });

  test('dark: botao "Criar primeira conta" deve ter texto branco sobre fundo colorido', async ({ page }) => {
    await loginUser(page, email);
    await page.evaluate(() => localStorage.setItem('fazopix-theme', 'dark'));
    await page.reload();
    await page.waitForTimeout(500);

    const btn = page.getByRole('button', { name: /Criar primeira conta/ });
    await expect(btn).toBeVisible();

    const { textColor, bgColor } = await btn.evaluate(el => {
      const s = getComputedStyle(el);
      return { textColor: s.color, bgColor: s.backgroundColor };
    });

    // Text should be white/very light
    const tRgb = textColor.match(/\d+/g)?.map(Number) || [];
    const textIsLight = tRgb.length >= 3 && tRgb.slice(0, 3).every(v => v > 200);
    expect(textIsLight, `Button text color ${textColor} should be white`).toBe(true);

    // Background should be colored (not transparent/black)
    const bRgb = bgColor.match(/\d+/g)?.map(Number) || [];
    const bgHasColor = bRgb.length >= 3 && bRgb.slice(0, 3).some(v => v > 40);
    expect(bgHasColor, `Button bg ${bgColor} should have color`).toBe(true);
  });

  test('dark: botao "Sair" deve ter texto legivel', async ({ page }) => {
    await loginUser(page, email);
    await page.evaluate(() => localStorage.setItem('fazopix-theme', 'dark'));
    await page.reload();
    await page.waitForTimeout(500);

    const sairBtn = page.getByRole('button', { name: /Sair/ });
    await expect(sairBtn).toBeVisible();
    const color = await getColor(sairBtn);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 120);
    expect(isReadable, `Sair button color ${color} should be readable in dark mode`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bills (/bills) — Light Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Bills (/bills) light mode', () => {
  let email: string;

  test.beforeAll(async ({ browser }) => {
    email = uniqueEmail();
    const page = await browser.newPage();
    await signupUser(page, email);
    await page.close();
  });

  test('light: h1 e subtitulo devem ter texto escuro', async ({ page }) => {
    await loginUser(page, email);
    await page.evaluate(() => {
      localStorage.setItem('fazopix-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload();
    await page.waitForTimeout(500);

    const h1Color = await getColor(page.locator('h1').first());
    expectDarkColor(h1Color, 'Bills h1 light');
  });

  test('light: empty state text deve ter texto escuro', async ({ page }) => {
    await loginUser(page, email);
    await page.evaluate(() => {
      localStorage.setItem('fazopix-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload();
    await page.waitForTimeout(500);

    const color = await getTextColor(page, /Nenhuma conta encontrada/);
    expectDarkColor(color, 'Bills empty state light');
  });
});

// ---------------------------------------------------------------------------
// Privacidade (/privacidade) — Dark Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Privacidade (/privacidade) dark mode', () => {
  test('dark: h1 "Politica de Privacidade" deve ter texto claro', async ({ page }) => {
    await gotoDark(page, '/privacidade');
    const color = await getColor(page.locator('h1').first());
    expectLightColor(color, 'Privacidade h1');
  });

  test('dark: section headings (h2) devem ter texto claro', async ({ page }) => {
    await gotoDark(page, '/privacidade');
    const headings = page.locator('h2');
    const count = await headings.count();
    expect(count).toBeGreaterThanOrEqual(8); // 10 sections
    for (let i = 0; i < count; i++) {
      const color = await getColor(headings.nth(i));
      expectLightColor(color, `Privacidade h2[${i}]`);
    }
  });

  test('dark: body text deve ter texto claro', async ({ page }) => {
    await gotoDark(page, '/privacidade');
    // Check the main text container
    const textContainer = page.locator('.space-y-8.text-sm');
    const color = await getColor(textContainer);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 150);
    expect(isReadable, `Privacidade body text color ${color} should be light in dark mode`).toBe(true);
  });

  test('dark: list items devem ser legiveis', async ({ page }) => {
    await gotoDark(page, '/privacidade');
    const listItems = page.locator('li');
    const count = await listItems.count();
    expect(count).toBeGreaterThan(5);

    // Check a sample of list items (first 5)
    const toCheck = Math.min(count, 5);
    for (let i = 0; i < toCheck; i++) {
      const color = await getColor(listItems.nth(i));
      const rgb = color.match(/\d+/g)?.map(Number) || [];
      const isReadable = rgb.length >= 3 && rgb.slice(0, 3).some(v => v > 100);
      expect(isReadable, `Privacidade list item ${i} color ${color} should be readable in dark mode`).toBe(true);
    }
  });

  test('dark: info boxes (green, blue, yellow) devem ter texto legivel', async ({ page }) => {
    await gotoDark(page, '/privacidade');

    // Green box — "Criptografia" heading
    const greenHeading = page.getByText('Criptografia').first();
    const greenColor = await getColor(greenHeading);
    const gRgb = greenColor.match(/\d+/g)?.map(Number) || [];
    const greenReadable = gRgb.length >= 3 && gRgb.slice(0, 3).some(v => v > 100);
    expect(greenReadable, `Green box heading color ${greenColor} should be readable in dark mode`).toBe(true);

    // Blue box — "Infraestrutura" heading
    const blueHeading = page.getByText('Infraestrutura').first();
    const blueColor = await getColor(blueHeading);
    const bRgb = blueColor.match(/\d+/g)?.map(Number) || [];
    const blueReadable = bRgb.length >= 3 && bRgb.slice(0, 3).some(v => v > 100);
    expect(blueReadable, `Blue box heading color ${blueColor} should be readable in dark mode`).toBe(true);

    // Yellow box — "Voce tem direito a:" text
    const yellowText = page.getByText(/tem direito a/).first();
    const yellowColor = await getColor(yellowText);
    const yRgb = yellowColor.match(/\d+/g)?.map(Number) || [];
    const yellowReadable = yRgb.length >= 3 && yRgb.slice(0, 3).some(v => v > 100);
    expect(yellowReadable, `Yellow box text color ${yellowColor} should be readable in dark mode`).toBe(true);
  });

  test('dark: subtitulo LGPD e last-updated text devem ser legiveis', async ({ page }) => {
    await gotoDark(page, '/privacidade');

    const subColor = await getTextColor(page, /Conforme LGPD/);
    const sRgb = subColor.match(/\d+/g)?.map(Number) || [];
    const subReadable = sRgb.length >= 3 && sRgb.slice(0, 3).some(v => v > 120);
    expect(subReadable, `Privacidade subtitle color ${subColor} should be readable in dark mode`).toBe(true);

    const updateColor = await getTextColor(page, /ltima atualiza/);
    const uRgb = updateColor.match(/\d+/g)?.map(Number) || [];
    const updateReadable = uRgb.length >= 3 && uRgb.slice(0, 3).some(v => v > 100);
    expect(updateReadable, `Last-updated text color ${updateColor} should be readable in dark mode`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Privacidade (/privacidade) — Light Mode
// ---------------------------------------------------------------------------

test.describe('Contraste - Privacidade (/privacidade) light mode', () => {
  test('light: h1 deve ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/privacidade');
    const color = await getColor(page.locator('h1').first());
    expectDarkColor(color, 'Privacidade h1 light');
  });

  test('light: section headings (h2) devem ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/privacidade');
    const headings = page.locator('h2');
    const count = await headings.count();
    expect(count).toBeGreaterThanOrEqual(8);
    for (let i = 0; i < count; i++) {
      const color = await getColor(headings.nth(i));
      expectDarkColor(color, `Privacidade h2[${i}] light`);
    }
  });

  test('light: body text e list items devem ter texto escuro', async ({ page }) => {
    await gotoLight(page, '/privacidade');
    const textContainer = page.locator('.space-y-8.text-sm');
    const color = await getColor(textContainer);
    const rgb = color.match(/\d+/g)?.map(Number) || [];
    const isDark = rgb.length >= 3 && rgb.slice(0, 3).every(v => v < 130);
    expect(isDark, `Privacidade body text color ${color} should be dark in light mode`).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-page: primary buttons contrast check (both modes)
// ---------------------------------------------------------------------------

test.describe('Contraste - Primary buttons across pages', () => {
  test('primary button "Comece agora" on landing must have white text on colored bg', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const btn = page.getByRole('link', { name: /Comece agora/ });
    await expect(btn).toBeVisible();

    const { textColor, bgColor } = await btn.evaluate(el => {
      const s = getComputedStyle(el);
      return { textColor: s.color, bgColor: s.backgroundColor };
    });

    const tRgb = textColor.match(/\d+/g)?.map(Number) || [];
    const textIsWhite = tRgb.length >= 3 && tRgb.slice(0, 3).every(v => v > 200);
    expect(textIsWhite, `"Comece agora" text ${textColor} should be white`).toBe(true);

    const bRgb = bgColor.match(/\d+/g)?.map(Number) || [];
    const bgNotWhite = bRgb.length >= 3 && !bRgb.slice(0, 3).every(v => v > 200);
    expect(bgNotWhite, `"Comece agora" bg ${bgColor} should not be white`).toBe(true);
  });

  test('primary button "Entrar" on login must have white text on colored bg', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const btn = page.getByRole('button', { name: /^Entrar$/ });
    await expect(btn).toBeVisible();

    const { textColor, bgColor } = await btn.evaluate(el => {
      const s = getComputedStyle(el);
      return { textColor: s.color, bgColor: s.backgroundColor };
    });

    const tRgb = textColor.match(/\d+/g)?.map(Number) || [];
    const textIsWhite = tRgb.length >= 3 && tRgb.slice(0, 3).every(v => v > 200);
    expect(textIsWhite, `"Entrar" button text ${textColor} should be white`).toBe(true);

    const bRgb = bgColor.match(/\d+/g)?.map(Number) || [];
    const bgNotWhite = bRgb.length >= 3 && !bRgb.slice(0, 3).every(v => v > 200);
    expect(bgNotWhite, `"Entrar" button bg ${bgColor} should not be white`).toBe(true);
  });

  test('primary button "Criar conta gratis" on signup must have white text on colored bg', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const btn = page.getByRole('button', { name: /Criar conta/i });
    await expect(btn).toBeVisible();

    const { textColor, bgColor } = await btn.evaluate(el => {
      const s = getComputedStyle(el);
      return { textColor: s.color, bgColor: s.backgroundColor };
    });

    const tRgb = textColor.match(/\d+/g)?.map(Number) || [];
    const textIsWhite = tRgb.length >= 3 && tRgb.slice(0, 3).every(v => v > 200);
    expect(textIsWhite, `"Criar conta" button text ${textColor} should be white`).toBe(true);

    const bRgb = bgColor.match(/\d+/g)?.map(Number) || [];
    const bgNotWhite = bRgb.length >= 3 && !bRgb.slice(0, 3).every(v => v > 200);
    expect(bgNotWhite, `"Criar conta" button bg ${bgColor} should not be white`).toBe(true);
  });
});
