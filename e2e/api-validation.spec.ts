import { test, expect, type APIRequestContext } from '@playwright/test';
import { uniqueEmail, signupUser, loginUser } from './helpers';

const apiBase = 'http://localhost:63292/api';

// ---------------------------------------------------------------------------
// Utility: sign up + log in via direct API, return session cookie string
// ---------------------------------------------------------------------------
async function apiSignup(
  request: APIRequestContext,
  email: string,
  fullName = 'API Teste',
  password = 'senha12345',
) {
  const res = await request.post(`${apiBase}/auth/signup`, {
    data: {
      fullName,
      password,
      identifiers: [{ type: 'PIX_EMAIL', value: email }],
    },
  });
  return res;
}

async function apiLogin(
  request: APIRequestContext,
  email: string,
  password = 'senha12345',
) {
  const res = await request.post(`${apiBase}/auth/login`, {
    data: { identifier: email, password },
  });
  return res;
}

/** Sign up + login via API, return cookie header value for subsequent calls */
async function getAuthCookie(
  request: APIRequestContext,
  email?: string,
): Promise<{ cookie: string; email: string }> {
  const e = email ?? uniqueEmail();
  await apiSignup(request, e);
  const loginRes = await apiLogin(request, e);
  const setCookie = loginRes.headers()['set-cookie'] ?? '';
  // Extract the fazopix_session cookie value
  const match = setCookie.match(/fazopix_session=([^;]+)/);
  const cookie = match ? `fazopix_session=${match[1]}` : '';
  return { cookie, email: e };
}

/** Create a bill via API and return its id */
async function apiCreateBill(
  request: APIRequestContext,
  cookie: string,
  name = 'Test Bill',
  simplifyDebts = false,
) {
  const res = await request.post(`${apiBase}/bills`, {
    headers: { cookie },
    data: { name, description: 'Test description', simplifyDebts },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

/** Add a member to a bill via API and return the member */
async function apiAddMember(
  request: APIRequestContext,
  cookie: string,
  billId: string,
  memberEmail: string,
  displayName = 'Membro Teste',
) {
  const res = await request.post(`${apiBase}/bills/${billId}/members`, {
    headers: { cookie },
    data: {
      identifierType: 'PIX_EMAIL',
      identifierValue: memberEmail,
      displayName,
    },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

/** Get full bill detail (includes members list) */
async function apiGetBill(
  request: APIRequestContext,
  cookie: string,
  billId: string,
) {
  const res = await request.get(`${apiBase}/bills/${billId}`, {
    headers: { cookie },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// ===========================================================================
// 1. Auth API Validation
// ===========================================================================
test.describe('1. Auth API Validation', () => {
  test('Signup payload check — form sends correct body', async ({ page }) => {
    const email = uniqueEmail();
    let capturedBody: Record<string, unknown> | null = null;

    await page.route('**/api/auth/signup', async (route) => {
      const req = route.request();
      capturedBody = req.postDataJSON();
      await route.continue();
    });

    await page.goto('/signup');
    await page.getByRole('textbox', { name: /Joao Silva/i }).fill('Payload Check');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Minimo 8/i }).fill('senha12345');
    await page.getByRole('textbox', { name: /Digite a senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Criar conta/i }).click();
    await page.waitForURL('**/login', { timeout: 10000 });

    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toHaveProperty('fullName', 'Payload Check');
    expect(capturedBody).toHaveProperty('password', 'senha12345');
    expect(capturedBody).toHaveProperty('identifiers');
    const identifiers = (capturedBody as Record<string, unknown>).identifiers as Array<Record<string, string>>;
    expect(identifiers).toHaveLength(1);
    expect(identifiers[0]).toMatchObject({ type: 'PIX_EMAIL', value: email });
  });

  test('Signup response check — API returns userId and message', async ({ request }) => {
    const email = uniqueEmail();
    const res = await apiSignup(request, email);

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('userId');
    expect(typeof body.userId).toBe('string');
    expect(body.userId.length).toBeGreaterThan(0);
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
  });

  test('Login payload check — form sends correct body', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);

    let capturedBody: Record<string, unknown> | null = null;
    await page.route('**/api/auth/login', async (route) => {
      capturedBody = route.request().postDataJSON();
      await route.continue();
    });

    await page.goto('/login');
    await page.getByRole('textbox', { name: /seu@email/i }).fill(email);
    await page.getByRole('textbox', { name: /Sua senha/i }).fill('senha12345');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await page.waitForURL('**/bills', { timeout: 10000 });

    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toHaveProperty('identifier', email);
    expect(capturedBody).toHaveProperty('password', 'senha12345');
  });

  test('Login response check — API returns userId and success message', async ({ request }) => {
    const email = uniqueEmail();
    await apiSignup(request, email);
    const res = await apiLogin(request, email);

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('userId');
    expect(typeof body.userId).toBe('string');
    expect(body).toHaveProperty('message', 'Login successful');
  });

  test('Logout response check — POST /api/auth/logout', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const res = await request.post(`${apiBase}/auth/logout`, {
      headers: { cookie },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('message', 'Logout successful');
  });

  test('Me endpoint check — GET /api/auth/me returns user shape', async ({ request }) => {
    const email = uniqueEmail();
    const { cookie } = await getAuthCookie(request, email);

    const res = await request.get(`${apiBase}/auth/me`, {
      headers: { cookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body).toHaveProperty('id');
    expect(typeof body.id).toBe('string');
    expect(body).toHaveProperty('fullName');
    expect(typeof body.fullName).toBe('string');
    expect(body).toHaveProperty('identifiers');
    expect(Array.isArray(body.identifiers)).toBe(true);
    expect(body.identifiers.length).toBeGreaterThanOrEqual(1);
    expect(body.identifiers[0]).toHaveProperty('type');
    expect(body.identifiers[0]).toHaveProperty('value');
    expect(body).toHaveProperty('createdAt');
  });
});

// ===========================================================================
// 2. Bills API Validation
// ===========================================================================
test.describe('2. Bills API Validation', () => {
  test('Create bill payload check — form sends correct body', async ({ page }) => {
    const email = uniqueEmail();
    await signupUser(page, email);
    await loginUser(page, email);

    let capturedBody: Record<string, unknown> | null = null;

    await page.route('**/api/bills', async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = route.request().postDataJSON();
      }
      await route.continue();
    });

    // Open create bill modal / form — look for the create button
    const createBtn = page.getByRole('button', { name: /Nova conta|Criar conta|New bill|Adicionar/i });
    await createBtn.click();

    // Fill in the bill name (wait for the modal/form to appear)
    const nameField = page.getByRole('textbox', { name: /nome|name/i }).first();
    await nameField.waitFor({ timeout: 5000 });
    await nameField.fill('Conta Teste API');

    // Try to fill description if present
    const descField = page.getByRole('textbox', { name: /descri/i });
    if (await descField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await descField.fill('Descricao de teste');
    }

    // Submit the bill creation
    const submitBtn = page.getByRole('button', { name: /Criar|Salvar|Create|Save/i });
    await submitBtn.click();

    // Wait for navigation or the modal to close
    await page.waitForTimeout(3000);

    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toHaveProperty('name');
    expect(typeof (capturedBody as Record<string, unknown>).name).toBe('string');
    // simplifyDebts should be present (default false)
    expect(capturedBody).toHaveProperty('simplifyDebts');
  });

  test('Create bill response — API returns bill with id', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const bill = await apiCreateBill(request, cookie, 'Conta Direct');

    expect(bill).toHaveProperty('id');
    expect(typeof bill.id).toBe('string');
    expect(bill).toHaveProperty('name', 'Conta Direct');
    expect(bill).toHaveProperty('description', 'Test description');
    expect(bill).toHaveProperty('simplifyDebts', false);
    expect(bill).toHaveProperty('createdAt');
  });

  test('List bills response — GET /api/bills returns array with _count', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    await apiCreateBill(request, cookie, 'Lista Bill 1');
    await apiCreateBill(request, cookie, 'Lista Bill 2');

    const res = await request.get(`${apiBase}/bills`, {
      headers: { cookie },
    });
    expect(res.ok()).toBeTruthy();
    const bills = await res.json();

    expect(Array.isArray(bills)).toBe(true);
    expect(bills.length).toBeGreaterThanOrEqual(2);

    const bill = bills[0];
    expect(bill).toHaveProperty('id');
    expect(bill).toHaveProperty('name');
    expect(bill).toHaveProperty('_count');
    expect(bill._count).toHaveProperty('members');
    expect(bill._count).toHaveProperty('expenses');
    expect(typeof bill._count.members).toBe('number');
    expect(typeof bill._count.expenses).toBe('number');
  });

  test('Get bill detail response — includes members, expenses, settlements', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const bill = await apiCreateBill(request, cookie, 'Detail Bill');

    const detail = await apiGetBill(request, cookie, bill.id);

    expect(detail).toHaveProperty('id', bill.id);
    expect(detail).toHaveProperty('name', 'Detail Bill');
    expect(detail).toHaveProperty('members');
    expect(Array.isArray(detail.members)).toBe(true);
    expect(detail.members.length).toBeGreaterThanOrEqual(1); // owner is auto-added
    expect(detail).toHaveProperty('expenses');
    expect(Array.isArray(detail.expenses)).toBe(true);
    expect(detail).toHaveProperty('settlements');
    expect(Array.isArray(detail.settlements)).toBe(true);
  });
});

// ===========================================================================
// 3. Expense API Validation
// ===========================================================================
test.describe('3. Expense API Validation', () => {
  test('Add expense payload and response — POST /api/bills/:id/expenses', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const bill = await apiCreateBill(request, cookie);

    // Add a second member so we can split
    const memberEmail = uniqueEmail();
    const member = await apiAddMember(request, cookie, bill.id, memberEmail);

    // Get bill to find owner's participant id
    const detail = await apiGetBill(request, cookie, bill.id);
    const ownerMember = detail.members.find(
      (m: { role: string }) => m.role === 'OWNER',
    );
    const ownerParticipantId: string = ownerMember.participantId;
    const memberParticipantId: string = member.participantId;

    const spentAt = new Date().toISOString();
    const expensePayload = {
      payerParticipantId: ownerParticipantId,
      amountCents: 10000,
      description: 'Almoço',
      spentAt,
      splits: [
        { shareType: 'EQUAL', participantId: ownerParticipantId },
        { shareType: 'EQUAL', participantId: memberParticipantId },
      ],
    };

    const res = await request.post(`${apiBase}/bills/${bill.id}/expenses`, {
      headers: { cookie },
      data: expensePayload,
    });
    expect(res.status()).toBe(201);
    const expense = await res.json();

    // Verify response shape
    expect(expense).toHaveProperty('id');
    expect(typeof expense.id).toBe('string');
    expect(expense).toHaveProperty('amountCents', 10000);
    expect(expense).toHaveProperty('payer');
    expect(expense.payer).toHaveProperty('id', ownerParticipantId);
    expect(expense).toHaveProperty('splits');
    expect(Array.isArray(expense.splits)).toBe(true);
    expect(expense.splits.length).toBe(2);

    // Each split should have participant info
    for (const split of expense.splits) {
      expect(split).toHaveProperty('participantId');
      expect(split).toHaveProperty('amountCents');
      expect(split).toHaveProperty('participant');
    }
  });

  test('Expense with EQUAL split — correct per-person amounts with remainder', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const bill = await apiCreateBill(request, cookie);

    // Add two more members (3 total including owner)
    const member2Email = uniqueEmail();
    const member3Email = uniqueEmail();
    const member2 = await apiAddMember(request, cookie, bill.id, member2Email, 'Membro 2');
    const member3 = await apiAddMember(request, cookie, bill.id, member3Email, 'Membro 3');

    const detail = await apiGetBill(request, cookie, bill.id);
    const ownerMember = detail.members.find(
      (m: { role: string }) => m.role === 'OWNER',
    );
    const ownerPId: string = ownerMember.participantId;
    const member2PId: string = member2.participantId;
    const member3PId: string = member3.participantId;

    // 10000 cents / 3 = 3333 each, remainder 1 cent
    const res = await request.post(`${apiBase}/bills/${bill.id}/expenses`, {
      headers: { cookie },
      data: {
        payerParticipantId: ownerPId,
        amountCents: 10000,
        description: 'Split test',
        spentAt: new Date().toISOString(),
        splits: [
          { shareType: 'EQUAL', participantId: ownerPId },
          { shareType: 'EQUAL', participantId: member2PId },
          { shareType: 'EQUAL', participantId: member3PId },
        ],
      },
    });
    expect(res.status()).toBe(201);
    const expense = await res.json();

    const splitAmounts = expense.splits
      .map((s: { amountCents: number }) => s.amountCents)
      .sort((a: number, b: number) => b - a);

    // Sum must equal total
    const total = splitAmounts.reduce((s: number, v: number) => s + v, 0);
    expect(total).toBe(10000);

    // floor(10000/3) = 3333, remainder = 1
    // First person gets 3334, other two get 3333
    expect(splitAmounts).toEqual([3334, 3333, 3333]);
  });

  test('Delete expense response — returns 204', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const bill = await apiCreateBill(request, cookie);

    const memberEmail = uniqueEmail();
    const member = await apiAddMember(request, cookie, bill.id, memberEmail);

    const detail = await apiGetBill(request, cookie, bill.id);
    const ownerPId: string = detail.members.find(
      (m: { role: string }) => m.role === 'OWNER',
    ).participantId;

    // Create expense
    const createRes = await request.post(`${apiBase}/bills/${bill.id}/expenses`, {
      headers: { cookie },
      data: {
        payerParticipantId: ownerPId,
        amountCents: 5000,
        description: 'To delete',
        spentAt: new Date().toISOString(),
        splits: [
          { shareType: 'EQUAL', participantId: ownerPId },
          { shareType: 'EQUAL', participantId: member.participantId },
        ],
      },
    });
    expect(createRes.status()).toBe(201);
    const expense = await createRes.json();

    // Delete it
    const deleteRes = await request.delete(
      `${apiBase}/bills/${bill.id}/expenses/${expense.id}`,
      { headers: { cookie } },
    );
    expect(deleteRes.status()).toBe(204);
  });
});

// ===========================================================================
// 4. Settlement API Validation
// ===========================================================================
test.describe('4. Settlement API Validation', () => {
  test('Record settlement payload and response', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const bill = await apiCreateBill(request, cookie);

    const memberEmail = uniqueEmail();
    const member = await apiAddMember(request, cookie, bill.id, memberEmail);

    const detail = await apiGetBill(request, cookie, bill.id);
    const ownerPId: string = detail.members.find(
      (m: { role: string }) => m.role === 'OWNER',
    ).participantId;
    const memberPId: string = member.participantId;

    const settlementPayload = {
      fromParticipantId: memberPId,
      toParticipantId: ownerPId,
      amountCents: 5000,
      method: 'PIX',
    };

    const res = await request.post(`${apiBase}/bills/${bill.id}/settlements`, {
      headers: { cookie },
      data: settlementPayload,
    });
    expect(res.status()).toBe(201);
    const settlement = await res.json();

    expect(settlement).toHaveProperty('id');
    expect(typeof settlement.id).toBe('string');
    expect(settlement).toHaveProperty('amountCents', 5000);
    expect(settlement).toHaveProperty('method', 'PIX');
    expect(settlement).toHaveProperty('fromParticipant');
    expect(settlement.fromParticipant).toHaveProperty('id', memberPId);
    expect(settlement).toHaveProperty('toParticipant');
    expect(settlement.toParticipant).toHaveProperty('id', ownerPId);
  });
});

// ===========================================================================
// 5. Balance API Validation
// ===========================================================================
test.describe('5. Balance API Validation', () => {
  test('Balance response structure — raw, simplified, simplifyEnabled', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const bill = await apiCreateBill(request, cookie, 'Balance Bill', true);

    const res = await request.get(`${apiBase}/bills/${bill.id}/balances`, {
      headers: { cookie },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body).toHaveProperty('raw');
    expect(body.raw).toHaveProperty('participants');
    expect(Array.isArray(body.raw.participants)).toBe(true);
    expect(body.raw).toHaveProperty('debts');
    expect(Array.isArray(body.raw.debts)).toBe(true);
    expect(body).toHaveProperty('simplified');
    expect(body).toHaveProperty('simplifyEnabled', true);
  });

  test('Balance math check — 2 members, expense paid by A split equally', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    const bill = await apiCreateBill(request, cookie, 'Math Bill', false);

    // Add second member
    const memberEmail = uniqueEmail();
    const member = await apiAddMember(request, cookie, bill.id, memberEmail);

    const detail = await apiGetBill(request, cookie, bill.id);
    const ownerPId: string = detail.members.find(
      (m: { role: string }) => m.role === 'OWNER',
    ).participantId;
    const memberPId: string = member.participantId;

    // Owner pays 10000 cents, split equally between 2
    await request.post(`${apiBase}/bills/${bill.id}/expenses`, {
      headers: { cookie },
      data: {
        payerParticipantId: ownerPId,
        amountCents: 10000,
        description: 'Jantar',
        spentAt: new Date().toISOString(),
        splits: [
          { shareType: 'EQUAL', participantId: ownerPId },
          { shareType: 'EQUAL', participantId: memberPId },
        ],
      },
    });

    const balRes = await request.get(`${apiBase}/bills/${bill.id}/balances`, {
      headers: { cookie },
    });
    expect(balRes.ok()).toBeTruthy();
    const balances = await balRes.json();

    const participants = balances.raw.participants as Array<{
      participantId: string;
      totalPaid: number;
      totalOwed: number;
      netBalance: number;
    }>;

    const ownerBal = participants.find((p) => p.participantId === ownerPId)!;
    const memberBal = participants.find((p) => p.participantId === memberPId)!;

    // Owner paid 10000, owes 5000 -> net +5000 (creditor)
    expect(ownerBal.totalPaid).toBe(10000);
    expect(ownerBal.totalOwed).toBe(5000);
    expect(ownerBal.netBalance).toBe(5000);

    // Member paid 0, owes 5000 -> net -5000 (debtor)
    expect(memberBal.totalPaid).toBe(0);
    expect(memberBal.totalOwed).toBe(5000);
    expect(memberBal.netBalance).toBe(-5000);

    // Debts: member owes owner 5000
    const debts = balances.raw.debts as Array<{
      fromParticipantId: string;
      toParticipantId: string;
      amountCents: number;
    }>;
    expect(debts.length).toBe(1);
    expect(debts[0].fromParticipantId).toBe(memberPId);
    expect(debts[0].toParticipantId).toBe(ownerPId);
    expect(debts[0].amountCents).toBe(5000);

    // Net balances must sum to zero
    const netSum = participants.reduce((s, p) => s + p.netBalance, 0);
    expect(netSum).toBe(0);
  });
});

// ===========================================================================
// 6. Error Response Validation
// ===========================================================================
test.describe('6. Error Response Validation', () => {
  test('401 for unauthenticated — GET /api/bills without cookie', async ({ request }) => {
    const res = await request.get(`${apiBase}/bills`);
    expect(res.status()).toBe(401);
  });

  test('409 conflict on duplicate signup', async ({ request }) => {
    const email = uniqueEmail();
    const first = await apiSignup(request, email);
    expect(first.status()).toBe(201);

    const second = await apiSignup(request, email);
    expect(second.status()).toBe(409);
  });

  test('401 invalid login credentials', async ({ request }) => {
    const email = uniqueEmail();
    await apiSignup(request, email);

    const res = await request.post(`${apiBase}/auth/login`, {
      data: { identifier: email, password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('404 or 403 for non-existent bill', async ({ request }) => {
    const { cookie } = await getAuthCookie(request);
    // Use a valid UUID format that does not exist
    const fakeBillId = '00000000-0000-0000-0000-000000000000';
    const res = await request.get(`${apiBase}/bills/${fakeBillId}`, {
      headers: { cookie },
    });
    // The API returns 403 (forbidden) because the user is not a member,
    // which fires before the 404 check. Accept either 403 or 404.
    expect([403, 404]).toContain(res.status());
  });
});
