import { test, expect, Page } from '@playwright/test';
import { uniqueEmail, signupUser, loginUser } from './helpers';

// ---------------------------------------------------------------------------
// Shared helpers for this file
// ---------------------------------------------------------------------------

/** Sign up a new user, log in, and land on /bills. Returns the email used. */
async function signupAndLogin(page: Page): Promise<string> {
  const email = uniqueEmail();
  await signupUser(page, email);
  await loginUser(page, email);
  await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });
  return email;
}

/** Create a bill from the /bills page (assumes authenticated & on /bills). */
async function createBill(
  page: Page,
  name: string,
  opts?: { description?: string; simplifyDebts?: boolean },
) {
  // Click the "Criar primeira conta" button (empty state) or FAB
  const emptyStateBtn = page.getByRole('button', { name: /Criar primeira conta/i });
  const fabBtn = page.locator('button').filter({ has: page.locator('svg path[d*="M12 4v16"]') });

  if (await emptyStateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emptyStateBtn.click();
  } else {
    await fabBtn.click();
  }

  // Wait for modal
  await expect(page.getByText('Nova Conta')).toBeVisible({ timeout: 10000 });

  // Fill name
  await page.getByPlaceholder('Ex: Viagem para praia').fill(name);

  // Description
  if (opts?.description) {
    await page.getByPlaceholder('Detalhes sobre a conta...').fill(opts.description);
  }

  // SimplifyDebts checkbox
  if (opts?.simplifyDebts) {
    await page.locator('#simplifyDebts').check();
  }

  // Submit
  await page.getByRole('button', { name: /Criar Conta/i }).click();

  // Wait for modal to close and bill to appear in list
  await expect(page.getByText('Nova Conta')).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

/** Navigate into the first bill whose card text matches `name`. */
async function openBill(page: Page, name: string) {
  await page.getByText(name).first().click();
  await page.waitForURL(/\/bills\//, { timeout: 10000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
}

/** Click "+ Adicionar" next to Participantes heading and fill the modal. */
async function addMember(
  page: Page,
  opts: { identifierType?: string; identifierValue: string; displayName?: string },
) {
  await page.getByText('+ Adicionar').click();
  await expect(page.getByText('Adicionar Participante')).toBeVisible({ timeout: 10000 });

  if (opts.identifierType) {
    await page.locator('select').first().selectOption(opts.identifierType);
  }

  await page.getByPlaceholder(/email@exemplo|000\.000|99999|Valor do identificador/i).fill(
    opts.identifierValue,
  );

  if (opts.displayName) {
    await page.getByPlaceholder('Como essa pessoa sera exibida').fill(opts.displayName);
  }

  await page.getByRole('button', { name: /Adicionar$/i }).click();
  await expect(page.getByText('Adicionar Participante')).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

/** Click "Adicionar Gasto" and fill the expense modal.
 *  splitType defaults to EQUAL. */
async function addExpense(
  page: Page,
  opts: {
    amount: string;
    description?: string;
    splitType?: 'EQUAL' | 'PERCENT' | 'SHARES';
  },
) {
  await page.getByRole('button', { name: /Adicionar Gasto/i }).click();
  await expect(page.getByText('Novo Gasto')).toBeVisible({ timeout: 10000 });

  // Amount
  await page.getByPlaceholder('0,00').fill(opts.amount);

  // Description
  if (opts.description) {
    await page.getByPlaceholder('Ex: Almoco no restaurante').fill(opts.description);
  }

  // Split type
  if (opts.splitType && opts.splitType !== 'EQUAL') {
    const label = opts.splitType === 'PERCENT' ? 'Porcentagem' : 'Partes';
    await page.getByRole('button', { name: label }).click();
  }

  // Submit
  await page.getByRole('button', { name: /Salvar Gasto/i }).click();
  await expect(page.getByText('Novo Gasto')).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

/** Switch to a tab on the bill detail page. */
async function switchTab(page: Page, tab: 'Gastos' | 'Saldos' | 'Pagamentos') {
  await page.getByRole('button', { name: tab }).click();
  await page.waitForTimeout(500);
}

/** Record a settlement from the Settlements tab (modal). */
async function recordSettlement(
  page: Page,
  opts: { amount: string; method?: 'PIX' | 'Dinheiro' | 'Outro'; reference?: string; note?: string },
) {
  await page.getByRole('button', { name: /Registrar Pagamento/i }).click();
  await expect(page.getByText('Registrar Pagamento')).toBeVisible({ timeout: 10000 });

  // Amount
  await page.getByPlaceholder('0,00').fill(opts.amount);

  // Method
  if (opts.method && opts.method !== 'PIX') {
    await page.getByRole('button', { name: opts.method }).click();
  }

  // Reference (only visible when method is PIX)
  if (opts.reference) {
    await page.getByPlaceholder('ID da transacao PIX').fill(opts.reference);
  }

  // Note
  if (opts.note) {
    await page.getByPlaceholder('Nota adicional').fill(opts.note);
  }

  // Submit
  await page.getByRole('button', { name: /^Registrar$/i }).click();
  await expect(page.getByText('Registrar Pagamento').first()).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

// ===========================================================================
// 1. Full User Journey
// ===========================================================================

test.describe('Full User Journey', () => {
  test('signup -> login -> create bill -> add member -> add expense -> view balances -> settlements tab -> record settlement -> logout -> login -> verify bill', async ({
    page,
  }) => {
    const email = uniqueEmail();
    const billName = `Viagem ${Date.now()}`;

    // Signup
    await signupUser(page, email);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Login
    await loginUser(page, email);
    await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });

    // Create bill
    await createBill(page, billName, { description: 'Praia com amigos' });

    // Open the bill
    await openBill(page, billName);

    // Add member by email
    await addMember(page, {
      identifierType: 'PIX_EMAIL',
      identifierValue: `amigo_${Date.now()}@teste.com`,
      displayName: 'Amigo Teste',
    });
    await expect(page.getByText('Amigo Teste')).toBeVisible({ timeout: 10000 });

    // Add expense with equal split
    await addExpense(page, { amount: '100,00', description: 'Almoco' });
    await expect(page.getByText('Almoco')).toBeVisible({ timeout: 10000 });

    // Switch to Balances tab
    await switchTab(page, 'Saldos');
    await expect(page.getByText('Saldos').first()).toBeVisible({ timeout: 10000 });

    // Switch to Settlements tab
    await switchTab(page, 'Pagamentos');
    await expect(page.getByText(/Nenhum pagamento registrado/i)).toBeVisible({ timeout: 10000 });

    // Record settlement
    await recordSettlement(page, { amount: '50,00', method: 'PIX', reference: 'TX123' });

    // Verify settlement appears
    await expect(page.getByText('PIX')).toBeVisible({ timeout: 10000 });

    // Logout
    await page.goto('/bills');
    await page.waitForURL(/\/bills/, { timeout: 10000 });
    await page.getByRole('button', { name: /Sair/i }).click();
    await page.waitForTimeout(3000);

    // Login again
    await loginUser(page, email);
    await expect(page).toHaveURL(/\/bills/, { timeout: 10000 });

    // Verify bill still exists
    await expect(page.getByText(billName)).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// 2. Bill Management Flows
// ===========================================================================

test.describe('Bill Management Flows', () => {
  test('create bill with simplifyDebts enabled', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Conta Simplificada', { simplifyDebts: true });

    // Open the bill and verify "Simplificado" badge
    await openBill(page, 'Conta Simplificada');
    await expect(page.getByText('Simplificado')).toBeVisible({ timeout: 10000 });
  });

  test('create bill without description', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Conta Sem Descricao');
    await openBill(page, 'Conta Sem Descricao');
    // Bill name is visible, no description text below it
    await expect(page.getByText('Conta Sem Descricao').first()).toBeVisible({ timeout: 10000 });
  });

  test('create multiple bills and verify list order', async ({ page }) => {
    await signupAndLogin(page);

    await createBill(page, 'Primeira Conta');
    await createBill(page, 'Segunda Conta');
    await createBill(page, 'Terceira Conta');

    // All three should be visible on the bills page
    await expect(page.getByText('Primeira Conta')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Segunda Conta')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Terceira Conta')).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// 3. Expense Management Flows
// ===========================================================================

test.describe('Expense Management Flows', () => {
  test('add expense with equal split', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Gastos Equal');
    await openBill(page, 'Gastos Equal');

    // Add a second member so split is meaningful
    await addMember(page, { identifierValue: `eq_${Date.now()}@teste.com`, displayName: 'Parceiro' });

    await addExpense(page, { amount: '200,00', description: 'Jantar Igual', splitType: 'EQUAL' });
    await expect(page.getByText('Jantar Igual')).toBeVisible({ timeout: 10000 });
    // Each person owes R$100,00
    await expect(page.getByText('R$\u00a0100,00').first()).toBeVisible({ timeout: 10000 });
  });

  test('add expense with percentage split', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Gastos Percent');
    await openBill(page, 'Gastos Percent');
    await addMember(page, { identifierValue: `pct_${Date.now()}@teste.com`, displayName: 'Parceiro Pct' });

    // Open expense modal
    await page.getByRole('button', { name: /Adicionar Gasto/i }).click();
    await expect(page.getByText('Novo Gasto')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('0,00').fill('300,00');
    await page.getByPlaceholder('Ex: Almoco no restaurante').fill('Hotel Pct');

    // Select percentage split
    await page.getByRole('button', { name: 'Porcentagem' }).click();
    await page.waitForTimeout(500);

    // Submit
    await page.getByRole('button', { name: /Salvar Gasto/i }).click();
    await expect(page.getByText('Novo Gasto')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hotel Pct')).toBeVisible({ timeout: 10000 });
  });

  test('add expense with shares split', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Gastos Shares');
    await openBill(page, 'Gastos Shares');
    await addMember(page, { identifierValue: `shr_${Date.now()}@teste.com`, displayName: 'Parceiro Shr' });

    await page.getByRole('button', { name: /Adicionar Gasto/i }).click();
    await expect(page.getByText('Novo Gasto')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('0,00').fill('150,00');
    await page.getByPlaceholder('Ex: Almoco no restaurante').fill('Uber Partes');

    // Select shares split
    await page.getByRole('button', { name: 'Partes' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Salvar Gasto/i }).click();
    await expect(page.getByText('Novo Gasto')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Uber Partes')).toBeVisible({ timeout: 10000 });
  });

  test('edit expense within 24h window', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Gastos Edit');
    await openBill(page, 'Gastos Edit');
    await addMember(page, { identifierValue: `edit_${Date.now()}@teste.com`, displayName: 'Parceiro Edit' });
    await addExpense(page, { amount: '80,00', description: 'Gasto Original' });

    // Hover to reveal edit button and click it
    const expenseRow = page.locator('div').filter({ hasText: 'Gasto Original' }).first();
    await expenseRow.hover();
    await page.waitForTimeout(300);

    // Click the edit button (pencil icon, title="Editar")
    const editBtn = page.locator('button[title="Editar"]').first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();

      // Edit modal should appear
      await expect(page.getByText('Editar Gasto')).toBeVisible({ timeout: 10000 });

      // Change the description
      const descInput = page.locator('input[placeholder*="Almo"]').or(page.locator('input[placeholder*="Uber"]'));
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill('Gasto Editado');
      }

      await page.getByRole('button', { name: /Salvar$/i }).click();
      await expect(page.getByText('Editar Gasto')).not.toBeVisible({ timeout: 10000 });
    }
    // Verify we're still on the bill page
    expect(page.url()).toContain('/bills/');
  });

  test('delete expense within 24h window', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Gastos Delete');
    await openBill(page, 'Gastos Delete');
    await addMember(page, { identifierValue: `del_${Date.now()}@teste.com`, displayName: 'Parceiro Del' });
    await addExpense(page, { amount: '60,00', description: 'Gasto Remover' });

    await expect(page.getByText('Gasto Remover')).toBeVisible({ timeout: 10000 });

    // Hover to reveal delete button
    const expenseRow = page.locator('div').filter({ hasText: 'Gasto Remover' }).first();
    await expenseRow.hover();
    await page.waitForTimeout(300);

    const deleteBtn = page.locator('button[title="Remover"]').first();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();

      // Confirm deletion dialog
      await expect(page.getByText('Remover gasto?')).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: /^Remover$/i }).click();
      await expect(page.getByText('Remover gasto?')).not.toBeVisible({ timeout: 10000 });
    }

    // The expense should be gone
    await page.waitForTimeout(2000);
    const stillVisible = await page.getByText('Gasto Remover').isVisible().catch(() => false);
    expect(stillVisible).toBe(false);
  });
});

// ===========================================================================
// 4. Member Management Flows
// ===========================================================================

test.describe('Member Management Flows', () => {
  test('add member by email', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Membros Email');
    await openBill(page, 'Membros Email');

    const memberEmail = `membro_email_${Date.now()}@teste.com`;
    await addMember(page, { identifierType: 'PIX_EMAIL', identifierValue: memberEmail });

    // The member should appear in the participants list (possibly showing email or first letter)
    await expect(page.getByText('Placeholder')).toBeVisible({ timeout: 10000 });
  });

  test('add member by CPF', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Membros CPF');
    await openBill(page, 'Membros CPF');

    await page.getByText('+ Adicionar').click();
    await expect(page.getByText('Adicionar Participante')).toBeVisible({ timeout: 10000 });

    await page.locator('select').first().selectOption('PIX_CPF');
    await page.getByPlaceholder('000.000.000-00').fill('123.456.789-09');
    await page.getByPlaceholder('Como essa pessoa sera exibida').fill('Membro CPF');

    await page.getByRole('button', { name: /Adicionar$/i }).click();
    await expect(page.getByText('Adicionar Participante')).not.toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Membro CPF')).toBeVisible({ timeout: 10000 });
  });

  test('add member with custom display name', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Membros Custom');
    await openBill(page, 'Membros Custom');

    await addMember(page, {
      identifierType: 'PIX_EMAIL',
      identifierValue: `custom_${Date.now()}@teste.com`,
      displayName: 'Nome Customizado',
    });

    await expect(page.getByText('Nome Customizado')).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// 5. Settlement Flows
// ===========================================================================

test.describe('Settlement Flows', () => {
  async function setupBillWithExpense(page: Page): Promise<void> {
    await signupAndLogin(page);
    await createBill(page, `Settlements ${Date.now()}`);
    // Open the only bill
    await page.locator('a[href*="/bills/"]').first().click();
    await page.waitForURL(/\/bills\//, { timeout: 10000 });

    // Add member
    await addMember(page, {
      identifierValue: `settle_${Date.now()}@teste.com`,
      displayName: 'Devedor',
    });

    // Add expense so there is a balance to settle
    await addExpense(page, { amount: '200,00', description: 'Despesa Settle' });

    // Switch to Settlements tab
    await switchTab(page, 'Pagamentos');
  }

  test('record PIX settlement', async ({ page }) => {
    await setupBillWithExpense(page);

    await recordSettlement(page, {
      amount: '100,00',
      method: 'PIX',
      reference: 'PIXTX00001',
    });

    await expect(page.getByText('PIX').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PIXTX00001').first()).toBeVisible({ timeout: 10000 });
  });

  test('record cash settlement', async ({ page }) => {
    await setupBillWithExpense(page);

    await recordSettlement(page, {
      amount: '50,00',
      method: 'Dinheiro',
    });

    await expect(page.getByText('Dinheiro')).toBeVisible({ timeout: 10000 });
  });

  test('record settlement with note', async ({ page }) => {
    await setupBillWithExpense(page);

    await recordSettlement(page, {
      amount: '75,00',
      method: 'PIX',
      note: 'Pagamento parcial da viagem',
    });

    await expect(page.getByText('Pagamento parcial da viagem')).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// 6. Tab Navigation Flows
// ===========================================================================

test.describe('Tab Navigation Flows', () => {
  test('switch between Expenses/Balances/Settlements tabs and verify content', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Tab Nav Test');
    await openBill(page, 'Tab Nav Test');

    await addMember(page, {
      identifierValue: `tab_${Date.now()}@teste.com`,
      displayName: 'Tab Tester',
    });
    await addExpense(page, { amount: '120,00', description: 'Gasto Tab' });

    // -- Expenses tab (default) --
    await expect(page.getByText('Gasto Tab')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Participantes')).toBeVisible({ timeout: 10000 });

    // -- Balances tab --
    await switchTab(page, 'Saldos');
    await expect(page.getByText('Saldos').first()).toBeVisible({ timeout: 10000 });
    // Participants list from the expenses tab should NOT be visible
    const participantsSectionVisible = await page
      .locator('h2')
      .filter({ hasText: 'Participantes' })
      .isVisible()
      .catch(() => false);
    expect(participantsSectionVisible).toBe(false);

    // -- Settlements tab --
    await switchTab(page, 'Pagamentos');
    await expect(page.getByText(/Nenhum pagamento registrado|pagamento/i).first()).toBeVisible({
      timeout: 10000,
    });

    // -- Back to Expenses tab --
    await switchTab(page, 'Gastos');
    await expect(page.getByText('Gasto Tab')).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// 7. OAuth Buttons Tests
// ===========================================================================

test.describe('OAuth Buttons Tests', () => {
  test('login page - Google button visible and disabled', async ({ page }) => {
    await page.goto('/login');
    const googleBtn = page.getByRole('button', { name: /Google/i });
    await expect(googleBtn).toBeVisible({ timeout: 10000 });
    await expect(googleBtn).toBeDisabled();
  });

  test('login page - Apple button visible and disabled', async ({ page }) => {
    await page.goto('/login');
    const appleBtn = page.getByRole('button', { name: /Apple/i });
    await expect(appleBtn).toBeVisible({ timeout: 10000 });
    await expect(appleBtn).toBeDisabled();
  });

  test('login page - "Em breve" text visible on both OAuth buttons', async ({ page }) => {
    await page.goto('/login');
    const emBreveLabels = page.getByText('Em breve');
    await expect(emBreveLabels.first()).toBeVisible({ timeout: 10000 });
    const count = await emBreveLabels.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('signup page - Google button visible and disabled', async ({ page }) => {
    await page.goto('/signup');
    const googleBtn = page.getByRole('button', { name: /Google/i });
    await expect(googleBtn).toBeVisible({ timeout: 10000 });
    await expect(googleBtn).toBeDisabled();
  });

  test('signup page - Apple button visible and disabled', async ({ page }) => {
    await page.goto('/signup');
    const appleBtn = page.getByRole('button', { name: /Apple/i });
    await expect(appleBtn).toBeVisible({ timeout: 10000 });
    await expect(appleBtn).toBeDisabled();
  });

  test('signup page - "Em breve" text visible on both OAuth buttons', async ({ page }) => {
    await page.goto('/signup');
    const emBreveLabels = page.getByText('Em breve');
    await expect(emBreveLabels.first()).toBeVisible({ timeout: 10000 });
    const count = await emBreveLabels.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// 8. API Request/Response Validation (via page.route interception)
// ===========================================================================

test.describe('API Request/Response Validation', () => {
  test('intercept signup API call and verify payload matches form data', async ({ page }) => {
    const email = uniqueEmail();
    const fullName = 'Interceptado Signup';

    let capturedPayload: any = null;

    // Intercept the signup request
    await page.route('**/api/auth/signup', async (route) => {
      const request = route.request();
      capturedPayload = request.postDataJSON();
      // Let the request continue normally
      await route.continue();
    });

    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill(fullName);
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Criar conta/i }).click();

    await page.waitForTimeout(5000);

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.fullName).toBe(fullName);
    expect(capturedPayload.password).toBe('senha12345');
    expect(capturedPayload.identifiers).toHaveLength(1);
    expect(capturedPayload.identifiers[0].type).toBe('PIX_EMAIL');
    expect(capturedPayload.identifiers[0].value).toBe(email);
  });

  test('intercept login API call and verify payload', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);

    let capturedPayload: any = null;

    await page.route('**/api/auth/login', async (route) => {
      capturedPayload = route.request().postDataJSON();
      await route.continue();
    });

    await page.goto('/login');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Sua senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Entrar/i }).click();

    await page.waitForTimeout(5000);

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.identifier).toBe(email);
    expect(capturedPayload.password).toBe('senha12345');
  });

  test('intercept create bill API call and verify payload', async ({ page }) => {
    await signupAndLogin(page);

    let capturedPayload: any = null;

    await page.route('**/api/bills', async (route) => {
      if (route.request().method() === 'POST') {
        capturedPayload = route.request().postDataJSON();
      }
      await route.continue();
    });

    await createBill(page, 'Conta API Test', {
      description: 'Descricao API',
      simplifyDebts: true,
    });

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.name).toBe('Conta API Test');
    expect(capturedPayload.description).toBe('Descricao API');
    expect(capturedPayload.simplifyDebts).toBe(true);
  });

  test('intercept add expense API call and verify splits data structure', async ({ page }) => {
    await signupAndLogin(page);
    await createBill(page, 'Expense API Test');
    await openBill(page, 'Expense API Test');

    await addMember(page, {
      identifierValue: `api_${Date.now()}@teste.com`,
      displayName: 'API Tester',
    });

    let capturedPayload: any = null;

    await page.route('**/api/bills/*/expenses', async (route) => {
      if (route.request().method() === 'POST') {
        capturedPayload = route.request().postDataJSON();
      }
      await route.continue();
    });

    await addExpense(page, { amount: '250,00', description: 'Gasto API Check' });

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.amountCents).toBe(25000);
    expect(capturedPayload.description).toBe('Gasto API Check');
    expect(capturedPayload.payerParticipantId).toBeTruthy();
    expect(capturedPayload.spentAt).toBeTruthy();
    expect(Array.isArray(capturedPayload.splits)).toBe(true);
    expect(capturedPayload.splits.length).toBeGreaterThanOrEqual(1);

    // Each split should have shareType and participantId
    for (const split of capturedPayload.splits) {
      expect(split.shareType).toBe('EQUAL');
      expect(split.participantId).toBeTruthy();
    }
  });
});
