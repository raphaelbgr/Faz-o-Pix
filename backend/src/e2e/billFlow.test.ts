/**
 * E2E Flow Tests
 * Tests the complete bill lifecycle: create bill -> add members -> add expense -> view balances -> settle
 * These tests validate schemas, calculations, and data flow without a live database.
 */
import { describe, it, expect } from 'vitest';
import { signupSchema, loginSchema } from '../schemas/auth';
import { createBillSchema, addMemberSchema, addExpenseSchema, recordSettlementSchema } from '../schemas/bills';
import { calculateBalances, simplifyDebts, validateBalances } from '../services/balanceCalculator';
import { generatePixBRCode } from '../utils/pixPayment';
import { normalizeIdentifier, detectIdentifierType } from '../utils/validation';
import { Prisma } from '@prisma/client';

// Helper to build test data for balance calculations
function makeBill(opts: {
  members: Array<{ id: string; name: string }>;
  expenses: Array<{
    payerId: string;
    amountCents: number;
    splits: Array<{ participantId: string; amountCents: number }>;
  }>;
  settlements?: Array<{
    fromId: string;
    toId: string;
    amountCents: number;
  }>;
  simplifyDebts?: boolean;
}) {
  return {
    id: 'bill-e2e',
    ownerUserId: 'user-1',
    name: 'Viagem ao Rio',
    description: 'Gastos da viagem',
    currency: 'BRL',
    simplifyDebts: opts.simplifyDebts ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: opts.members.map((m) => ({
      id: `member-${m.id}`,
      billId: 'bill-e2e',
      participantId: m.id,
      role: 'MEMBER' as const,
      createdAt: new Date(),
      participant: {
        id: m.id,
        displayName: m.name,
        createdAt: new Date(),
      },
    })),
    expenses: opts.expenses.map((e, i) => ({
      id: `expense-${i}`,
      billId: 'bill-e2e',
      payerParticipantId: e.payerId,
      amountCents: e.amountCents,
      description: `Gasto ${i + 1}`,
      spentAt: new Date(),
      createdAt: new Date(),
      splits: e.splits.map((s, j) => ({
        id: `split-${i}-${j}`,
        expenseId: `expense-${i}`,
        participantId: s.participantId,
        shareType: 'EQUAL' as const,
        shareValue: new Prisma.Decimal(1),
        amountCents: s.amountCents,
      })),
    })),
    settlements: (opts.settlements || []).map((s, i) => ({
      id: `settlement-${i}`,
      billId: 'bill-e2e',
      fromParticipantId: s.fromId,
      toParticipantId: s.toId,
      amountCents: s.amountCents,
      method: 'PIX' as const,
      reference: null,
      note: null,
      createdAt: new Date(),
    })),
  };
}

describe('E2E: Complete Bill Flow', () => {
  describe('Step 1: User Registration', () => {
    it('should validate signup for a Brazilian user with CPF', () => {
      const signup = signupSchema.safeParse({
        body: {
          fullName: 'Ana Clara',
          password: 'MinhaSenha123!',
          identifiers: [
            { type: 'PIX_CPF', value: '529.982.247-25' },
          ],
        },
      });
      expect(signup.success).toBe(true);
    });

    it('should validate login for the registered user', () => {
      const login = loginSchema.safeParse({
        body: {
          identifier: '529.982.247-25',
          password: 'MinhaSenha123!',
        },
      });
      expect(login.success).toBe(true);

      // Auto-detect identifier type
      const type = detectIdentifierType('529.982.247-25');
      expect(type).toBe('PIX_CPF');
    });
  });

  describe('Step 2: Create Bill', () => {
    it('should validate bill creation', () => {
      const bill = createBillSchema.safeParse({
        body: {
          name: 'Viagem ao Rio',
          description: 'Gastos da viagem de fim de semana',
          simplifyDebts: true,
        },
      });
      expect(bill.success).toBe(true);
      if (bill.success) {
        expect(bill.data.body.name).toBe('Viagem ao Rio');
        expect(bill.data.body.simplifyDebts).toBe(true);
      }
    });

    it('should validate bill creation without description', () => {
      const bill = createBillSchema.safeParse({
        body: {
          name: 'Almoço de terça',
        },
      });
      expect(bill.success).toBe(true);
      if (bill.success) {
        expect(bill.data.body.simplifyDebts).toBe(false); // default
      }
    });
  });

  describe('Step 3: Add Members', () => {
    const billId = '550e8400-e29b-41d4-a716-446655440000';

    it('should validate adding a member by email', () => {
      const member = addMemberSchema.safeParse({
        params: { id: billId },
        body: {
          identifierType: 'PIX_EMAIL',
          identifierValue: 'pedro@example.com',
          displayName: 'Pedro',
        },
      });
      expect(member.success).toBe(true);
    });

    it('should validate adding a member by CPF', () => {
      const member = addMemberSchema.safeParse({
        params: { id: billId },
        body: {
          identifierType: 'PIX_CPF',
          identifierValue: '529.982.247-25',
          displayName: 'Maria',
        },
      });
      expect(member.success).toBe(true);
    });

    it('should validate adding a member by phone', () => {
      const member = addMemberSchema.safeParse({
        params: { id: billId },
        body: {
          identifierType: 'PIX_PHONE',
          identifierValue: '+5511999998888',
        },
      });
      expect(member.success).toBe(true);
    });

    it('should reject invalid member identifier', () => {
      const member = addMemberSchema.safeParse({
        params: { id: billId },
        body: {
          identifierType: 'PIX_CPF',
          identifierValue: '123', // invalid CPF
        },
      });
      expect(member.success).toBe(false);
    });
  });

  describe('Step 4: Add Expenses', () => {
    const billId = '550e8400-e29b-41d4-a716-446655440000';
    const payerId = '660e8400-e29b-41d4-a716-446655440001';
    const member2 = '660e8400-e29b-41d4-a716-446655440002';
    const member3 = '660e8400-e29b-41d4-a716-446655440003';

    it('should validate adding an equal-split expense', () => {
      const expense = addExpenseSchema.safeParse({
        params: { id: billId },
        body: {
          payerParticipantId: payerId,
          amountCents: 15000,
          description: 'Jantar no restaurante',
          spentAt: new Date().toISOString(),
          splits: [
            { shareType: 'EQUAL', participantId: payerId },
            { shareType: 'EQUAL', participantId: member2 },
            { shareType: 'EQUAL', participantId: member3 },
          ],
        },
      });
      expect(expense.success).toBe(true);
    });

    it('should validate adding a percentage-split expense', () => {
      const expense = addExpenseSchema.safeParse({
        params: { id: billId },
        body: {
          payerParticipantId: payerId,
          amountCents: 20000,
          description: 'Hotel',
          spentAt: new Date().toISOString(),
          splits: [
            { shareType: 'PERCENT', participantId: payerId, shareValue: 50 },
            { shareType: 'PERCENT', participantId: member2, shareValue: 25 },
            { shareType: 'PERCENT', participantId: member3, shareValue: 25 },
          ],
        },
      });
      expect(expense.success).toBe(true);
    });

    it('should reject percentage splits not summing to 100', () => {
      const expense = addExpenseSchema.safeParse({
        params: { id: billId },
        body: {
          payerParticipantId: payerId,
          amountCents: 20000,
          description: 'Hotel',
          spentAt: new Date().toISOString(),
          splits: [
            { shareType: 'PERCENT', participantId: payerId, shareValue: 50 },
            { shareType: 'PERCENT', participantId: member2, shareValue: 20 },
          ],
        },
      });
      expect(expense.success).toBe(false);
    });

    it('should reject expense with zero amount', () => {
      const expense = addExpenseSchema.safeParse({
        params: { id: billId },
        body: {
          payerParticipantId: payerId,
          amountCents: 0,
          spentAt: new Date().toISOString(),
          splits: [{ shareType: 'EQUAL', participantId: payerId }],
        },
      });
      expect(expense.success).toBe(false);
    });
  });

  describe('Step 5: View Balances', () => {
    it('should calculate correct balances for 3-person dinner', () => {
      // Ana pays R$150 for dinner, split equally between Ana, Pedro, Maria
      const bill = makeBill({
        members: [
          { id: 'ana', name: 'Ana' },
          { id: 'pedro', name: 'Pedro' },
          { id: 'maria', name: 'Maria' },
        ],
        expenses: [
          {
            payerId: 'ana',
            amountCents: 15000,
            splits: [
              { participantId: 'ana', amountCents: 5000 },
              { participantId: 'pedro', amountCents: 5000 },
              { participantId: 'maria', amountCents: 5000 },
            ],
          },
        ],
      });

      const balances = calculateBalances(bill);
      expect(validateBalances(balances.participants)).toBe(true);

      const ana = balances.participants.find(p => p.participantId === 'ana')!;
      const pedro = balances.participants.find(p => p.participantId === 'pedro')!;
      const maria = balances.participants.find(p => p.participantId === 'maria')!;

      expect(ana.netBalance).toBe(10000); // paid 15000, owes 5000
      expect(pedro.netBalance).toBe(-5000);
      expect(maria.netBalance).toBe(-5000);

      // Should generate 2 debts
      expect(balances.debts).toHaveLength(2);
      expect(balances.debts.every(d => d.toParticipantId === 'ana')).toBe(true);
    });

    it('should calculate balances with multiple expenses', () => {
      // Trip scenario: Ana pays dinner, Pedro pays hotel, Maria pays gas
      const bill = makeBill({
        members: [
          { id: 'ana', name: 'Ana' },
          { id: 'pedro', name: 'Pedro' },
          { id: 'maria', name: 'Maria' },
        ],
        expenses: [
          {
            payerId: 'ana',
            amountCents: 15000,
            splits: [
              { participantId: 'ana', amountCents: 5000 },
              { participantId: 'pedro', amountCents: 5000 },
              { participantId: 'maria', amountCents: 5000 },
            ],
          },
          {
            payerId: 'pedro',
            amountCents: 30000,
            splits: [
              { participantId: 'ana', amountCents: 10000 },
              { participantId: 'pedro', amountCents: 10000 },
              { participantId: 'maria', amountCents: 10000 },
            ],
          },
          {
            payerId: 'maria',
            amountCents: 6000,
            splits: [
              { participantId: 'ana', amountCents: 2000 },
              { participantId: 'pedro', amountCents: 2000 },
              { participantId: 'maria', amountCents: 2000 },
            ],
          },
        ],
      });

      const balances = calculateBalances(bill);
      expect(validateBalances(balances.participants)).toBe(true);

      // Ana: paid 15000, owes 5000+10000+2000=17000, net = -2000
      // Pedro: paid 30000, owes 5000+10000+2000=17000, net = 13000
      // Maria: paid 6000, owes 5000+10000+2000=17000, net = -11000
      const ana = balances.participants.find(p => p.participantId === 'ana')!;
      const pedro = balances.participants.find(p => p.participantId === 'pedro')!;
      const maria = balances.participants.find(p => p.participantId === 'maria')!;

      expect(ana.netBalance).toBe(-2000);
      expect(pedro.netBalance).toBe(13000);
      expect(maria.netBalance).toBe(-11000);
    });
  });

  describe('Step 6: Simplify Debts', () => {
    it('should simplify debts for the trip scenario', () => {
      const bill = makeBill({
        members: [
          { id: 'ana', name: 'Ana' },
          { id: 'pedro', name: 'Pedro' },
          { id: 'maria', name: 'Maria' },
        ],
        expenses: [
          {
            payerId: 'ana',
            amountCents: 15000,
            splits: [
              { participantId: 'ana', amountCents: 5000 },
              { participantId: 'pedro', amountCents: 5000 },
              { participantId: 'maria', amountCents: 5000 },
            ],
          },
          {
            payerId: 'pedro',
            amountCents: 30000,
            splits: [
              { participantId: 'ana', amountCents: 10000 },
              { participantId: 'pedro', amountCents: 10000 },
              { participantId: 'maria', amountCents: 10000 },
            ],
          },
          {
            payerId: 'maria',
            amountCents: 6000,
            splits: [
              { participantId: 'ana', amountCents: 2000 },
              { participantId: 'pedro', amountCents: 2000 },
              { participantId: 'maria', amountCents: 2000 },
            ],
          },
        ],
        simplifyDebts: true,
      });

      const raw = calculateBalances(bill);
      const simplified = simplifyDebts(raw);

      // Simplified should have at most 2 transactions (Ana->Pedro, Maria->Pedro)
      expect(simplified.debts.length).toBeLessThanOrEqual(2);

      // Total amount transferred should be same
      const totalRaw = raw.debts.reduce((s, d) => s + d.amountCents, 0);
      const totalSimplified = simplified.debts.reduce((s, d) => s + d.amountCents, 0);
      expect(totalSimplified).toBe(totalRaw);
    });
  });

  describe('Step 7: Record Settlement', () => {
    const billId = '550e8400-e29b-41d4-a716-446655440000';
    const fromId = '660e8400-e29b-41d4-a716-446655440002';
    const toId = '660e8400-e29b-41d4-a716-446655440001';

    it('should validate recording a PIX settlement', () => {
      const settlement = recordSettlementSchema.safeParse({
        params: { id: billId },
        body: {
          fromParticipantId: fromId,
          toParticipantId: toId,
          amountCents: 5000,
          method: 'PIX',
          reference: 'E123456789',
          note: 'Pagamento jantar',
        },
      });
      expect(settlement.success).toBe(true);
    });

    it('should validate recording a cash settlement', () => {
      const settlement = recordSettlementSchema.safeParse({
        params: { id: billId },
        body: {
          fromParticipantId: fromId,
          toParticipantId: toId,
          amountCents: 11000,
          method: 'CASH',
        },
      });
      expect(settlement.success).toBe(true);
    });

    it('should reject settlement with invalid method', () => {
      const settlement = recordSettlementSchema.safeParse({
        params: { id: billId },
        body: {
          fromParticipantId: fromId,
          toParticipantId: toId,
          amountCents: 5000,
          method: 'BITCOIN',
        },
      });
      expect(settlement.success).toBe(false);
    });

    it('should reject settlement with zero amount', () => {
      const settlement = recordSettlementSchema.safeParse({
        params: { id: billId },
        body: {
          fromParticipantId: fromId,
          toParticipantId: toId,
          amountCents: 0,
          method: 'PIX',
        },
      });
      expect(settlement.success).toBe(false);
    });
  });

  describe('Step 8: Settlement reduces balances', () => {
    it('should reduce debts after settlement', () => {
      const bill = makeBill({
        members: [
          { id: 'ana', name: 'Ana' },
          { id: 'pedro', name: 'Pedro' },
        ],
        expenses: [
          {
            payerId: 'ana',
            amountCents: 10000,
            splits: [
              { participantId: 'ana', amountCents: 5000 },
              { participantId: 'pedro', amountCents: 5000 },
            ],
          },
        ],
        settlements: [
          { fromId: 'pedro', toId: 'ana', amountCents: 5000 },
        ],
      });

      const balances = calculateBalances(bill);

      // After full settlement, everyone should be at 0
      const ana = balances.participants.find(p => p.participantId === 'ana')!;
      const pedro = balances.participants.find(p => p.participantId === 'pedro')!;
      expect(ana.netBalance).toBe(0);
      expect(pedro.netBalance).toBe(0);
      expect(balances.debts).toHaveLength(0);
    });

    it('should handle partial settlement', () => {
      const bill = makeBill({
        members: [
          { id: 'ana', name: 'Ana' },
          { id: 'pedro', name: 'Pedro' },
        ],
        expenses: [
          {
            payerId: 'ana',
            amountCents: 10000,
            splits: [
              { participantId: 'ana', amountCents: 5000 },
              { participantId: 'pedro', amountCents: 5000 },
            ],
          },
        ],
        settlements: [
          { fromId: 'pedro', toId: 'ana', amountCents: 2000 },
        ],
      });

      const balances = calculateBalances(bill);
      const pedro = balances.participants.find(p => p.participantId === 'pedro')!;

      // Pedro still owes 3000 (5000 - 2000 settled)
      expect(pedro.netBalance).toBe(-3000);
    });
  });

  describe('Step 9: Generate Pix Payment', () => {
    it('should generate BR Code for a settlement payment', () => {
      const brCode = generatePixBRCode({
        pixKey: '52998224725',
        merchantName: 'ANA CLARA',
        amountCents: 5000,
        description: 'Faz-o-Pix: Viagem ao Rio',
        txId: 'FOPbill-e2e',
      });

      expect(brCode).toContain('br.gov.bcb.pix');
      expect(brCode).toContain('52998224725');
      expect(brCode).toContain('50.00');
      expect(brCode).toContain('ANA CLARA');
      expect(brCode).toContain('Faz-o-Pix');
      expect(brCode).toMatch(/6304[0-9A-F]{4}$/);
    });

    it('should normalize CPF key before generating code', () => {
      const normalizedCpf = normalizeIdentifier('PIX_CPF', '529.982.247-25');
      expect(normalizedCpf).toBe('52998224725');

      const brCode = generatePixBRCode({
        pixKey: normalizedCpf,
        merchantName: 'ANA',
        amountCents: 3000,
      });

      expect(brCode).toContain('52998224725');
    });
  });

  describe('Full Lifecycle Integration', () => {
    it('should complete entire flow: 4-person trip with settlement', () => {
      // 1. Create bill with 4 members
      const bill = makeBill({
        members: [
          { id: 'ana', name: 'Ana' },
          { id: 'pedro', name: 'Pedro' },
          { id: 'maria', name: 'Maria' },
          { id: 'joao', name: 'João' },
        ],
        expenses: [
          // Ana pays R$200 dinner (split 4 ways)
          {
            payerId: 'ana',
            amountCents: 20000,
            splits: [
              { participantId: 'ana', amountCents: 5000 },
              { participantId: 'pedro', amountCents: 5000 },
              { participantId: 'maria', amountCents: 5000 },
              { participantId: 'joao', amountCents: 5000 },
            ],
          },
          // Pedro pays R$400 hotel (split 4 ways)
          {
            payerId: 'pedro',
            amountCents: 40000,
            splits: [
              { participantId: 'ana', amountCents: 10000 },
              { participantId: 'pedro', amountCents: 10000 },
              { participantId: 'maria', amountCents: 10000 },
              { participantId: 'joao', amountCents: 10000 },
            ],
          },
          // Maria pays R$80 gas (split 4 ways)
          {
            payerId: 'maria',
            amountCents: 8000,
            splits: [
              { participantId: 'ana', amountCents: 2000 },
              { participantId: 'pedro', amountCents: 2000 },
              { participantId: 'maria', amountCents: 2000 },
              { participantId: 'joao', amountCents: 2000 },
            ],
          },
        ],
        simplifyDebts: true,
      });

      // 2. Calculate balances
      const rawBalances = calculateBalances(bill);
      expect(validateBalances(rawBalances.participants)).toBe(true);

      // Ana: paid 20000, owes 5000+10000+2000=17000 -> net = +3000
      // Pedro: paid 40000, owes 5000+10000+2000=17000 -> net = +23000
      // Maria: paid 8000, owes 5000+10000+2000=17000 -> net = -9000
      // João: paid 0, owes 5000+10000+2000=17000 -> net = -17000
      const ana = rawBalances.participants.find(p => p.participantId === 'ana')!;
      const pedro = rawBalances.participants.find(p => p.participantId === 'pedro')!;
      const maria = rawBalances.participants.find(p => p.participantId === 'maria')!;
      const joao = rawBalances.participants.find(p => p.participantId === 'joao')!;

      expect(ana.netBalance).toBe(3000);
      expect(pedro.netBalance).toBe(23000);
      expect(maria.netBalance).toBe(-9000);
      expect(joao.netBalance).toBe(-17000);

      // 3. Simplify debts
      const simplified = simplifyDebts(rawBalances);
      expect(simplified.debts.length).toBeLessThanOrEqual(rawBalances.debts.length);

      // All simplified debts should go to Pedro (biggest creditor) and Ana
      const totalDebt = simplified.debts.reduce((s, d) => s + d.amountCents, 0);
      expect(totalDebt).toBe(26000); // 9000 + 17000

      // 4. Generate Pix codes for each debt
      for (const debt of simplified.debts) {
        const brCode = generatePixBRCode({
          pixKey: `pix-${debt.toParticipantId}@email.com`,
          merchantName: debt.toParticipant.displayName || 'PARTICIPANTE',
          amountCents: debt.amountCents,
          description: 'Faz-o-Pix: Viagem ao Rio',
        });
        expect(brCode).toContain('br.gov.bcb.pix');
        expect(brCode).toMatch(/6304[0-9A-F]{4}$/);
      }

      // 5. Simulate settlements
      const billWithSettlements = makeBill({
        ...bill,
        members: [
          { id: 'ana', name: 'Ana' },
          { id: 'pedro', name: 'Pedro' },
          { id: 'maria', name: 'Maria' },
          { id: 'joao', name: 'João' },
        ],
        expenses: bill.expenses.map(e => ({
          payerId: e.payerParticipantId,
          amountCents: e.amountCents,
          splits: e.splits.map(s => ({
            participantId: s.participantId,
            amountCents: s.amountCents,
          })),
        })),
        settlements: simplified.debts.map(d => ({
          fromId: d.fromParticipantId,
          toId: d.toParticipantId,
          amountCents: d.amountCents,
        })),
      });

      // 6. After all settlements, everyone should be at 0
      const finalBalances = calculateBalances(billWithSettlements);
      for (const p of finalBalances.participants) {
        expect(Math.abs(p.netBalance)).toBeLessThanOrEqual(1); // within rounding
      }
      expect(finalBalances.debts).toHaveLength(0);
    });
  });
});
