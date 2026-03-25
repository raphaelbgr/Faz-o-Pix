import { describe, it, expect } from 'vitest';
import {
  addExpenseSchema,
  recordSettlementSchema,
  createBillSchema,
  addMemberSchema,
} from '../schemas/bills';

// Test the calculateSplitAmounts helper comprehensively for edge cases
// that aren't covered in splitCalculation.test.ts

type ShareTypeStr = 'EQUAL' | 'PERCENT' | 'SHARES';

function calculateSplitAmounts(
  totalCents: number,
  splits: Array<{
    shareType: ShareTypeStr;
    participantId: string;
    shareValue?: number;
  }>
): Array<{
  participantId: string;
  shareType: ShareTypeStr;
  shareValue: number;
  amountCents: number;
}> {
  const result: Array<{
    participantId: string;
    shareType: ShareTypeStr;
    shareValue: number;
    amountCents: number;
  }> = [];
  let remainingCents = totalCents;

  if (splits[0]?.shareType === 'EQUAL') {
    const equalParticipants = splits.filter(s => s.shareType === 'EQUAL');
    const amountPerPerson = Math.floor(totalCents / equalParticipants.length);
    const remainder = totalCents % equalParticipants.length;

    for (let i = 0; i < equalParticipants.length; i++) {
      const amount = i < remainder ? amountPerPerson + 1 : amountPerPerson;
      result.push({
        participantId: equalParticipants[i]!.participantId,
        shareType: 'EQUAL',
        shareValue: 1,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
  } else if (splits[0]?.shareType === 'PERCENT') {
    for (const split of splits) {
      const amount = Math.round((totalCents * (split.shareValue || 0)) / 100);
      result.push({
        participantId: split.participantId,
        shareType: 'PERCENT',
        shareValue: split.shareValue || 0,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
    if (remainingCents !== 0 && result.length > 0) {
      result[0]!.amountCents += remainingCents;
    }
  } else if (splits[0]?.shareType === 'SHARES') {
    const totalShares = splits.reduce((sum, s) => sum + (s.shareValue || 0), 0);
    for (const split of splits) {
      const amount = Math.round((totalCents * (split.shareValue || 0)) / totalShares);
      result.push({
        participantId: split.participantId,
        shareType: 'SHARES',
        shareValue: split.shareValue || 0,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
    if (remainingCents !== 0 && result.length > 0) {
      result[0]!.amountCents += remainingCents;
    }
  }

  return result;
}

describe('calculateSplitAmounts - additional edge cases', () => {
  it('should handle zero amount', () => {
    const result = calculateSplitAmounts(0, [
      { shareType: 'EQUAL', participantId: 'p1' },
      { shareType: 'EQUAL', participantId: 'p2' },
    ]);

    expect(result[0]!.amountCents).toBe(0);
    expect(result[1]!.amountCents).toBe(0);
    expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(0);
  });

  it('should handle percentage with very small amounts', () => {
    // R$ 0.03 split 33.33% / 33.33% / 33.34%
    const result = calculateSplitAmounts(3, [
      { shareType: 'PERCENT', participantId: 'p1', shareValue: 33.33 },
      { shareType: 'PERCENT', participantId: 'p2', shareValue: 33.33 },
      { shareType: 'PERCENT', participantId: 'p3', shareValue: 33.34 },
    ]);

    expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(3);
  });

  it('should handle shares with very different ratios (1:100)', () => {
    const result = calculateSplitAmounts(10100, [
      { shareType: 'SHARES', participantId: 'p1', shareValue: 1 },
      { shareType: 'SHARES', participantId: 'p2', shareValue: 100 },
    ]);

    // p1: 10100 * 1/101 = 100
    // p2: 10100 * 100/101 = 10000
    expect(result[0]!.amountCents).toBe(100);
    expect(result[1]!.amountCents).toBe(10000);
    expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(10100);
  });

  it('should handle equal split with 20 participants', () => {
    const splits = Array.from({ length: 20 }, (_, i) => ({
      shareType: 'EQUAL' as ShareTypeStr,
      participantId: `p${i}`,
    }));

    const result = calculateSplitAmounts(10003, splits);
    expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(10003);
    // 10003 / 20 = 500 remainder 3, so first 3 get 501
    expect(result.filter(r => r.amountCents === 501)).toHaveLength(3);
    expect(result.filter(r => r.amountCents === 500)).toHaveLength(17);
  });

  it('should handle percentage 50/50 with odd amount', () => {
    const result = calculateSplitAmounts(1001, [
      { shareType: 'PERCENT', participantId: 'p1', shareValue: 50 },
      { shareType: 'PERCENT', participantId: 'p2', shareValue: 50 },
    ]);

    // 1001 * 50/100 = 500.5, rounds to 501 each = 1002
    // Adjustment: first gets -1 = 500
    expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(1001);
  });
});

describe('Schema validation edge cases', () => {
  it('should validate percentage splits sum to 100', () => {
    // using imported addExpenseSchema

    // Valid: sums to 100
    const validResult = addExpenseSchema.safeParse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      body: {
        payerParticipantId: '550e8400-e29b-41d4-a716-446655440001',
        amountCents: 1000,
        spentAt: '2024-01-01T00:00:00.000Z',
        splits: [
          { shareType: 'PERCENT', participantId: '550e8400-e29b-41d4-a716-446655440001', shareValue: 60 },
          { shareType: 'PERCENT', participantId: '550e8400-e29b-41d4-a716-446655440002', shareValue: 40 },
        ],
      },
    });
    expect(validResult.success).toBe(true);

    // Invalid: sums to 90
    const invalidResult = addExpenseSchema.safeParse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      body: {
        payerParticipantId: '550e8400-e29b-41d4-a716-446655440001',
        amountCents: 1000,
        spentAt: '2024-01-01T00:00:00.000Z',
        splits: [
          { shareType: 'PERCENT', participantId: '550e8400-e29b-41d4-a716-446655440001', shareValue: 50 },
          { shareType: 'PERCENT', participantId: '550e8400-e29b-41d4-a716-446655440002', shareValue: 40 },
        ],
      },
    });
    expect(invalidResult.success).toBe(false);
  });

  it('should validate settlement schema', () => {
    // using imported recordSettlementSchema

    const valid = recordSettlementSchema.safeParse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      body: {
        fromParticipantId: '550e8400-e29b-41d4-a716-446655440001',
        toParticipantId: '550e8400-e29b-41d4-a716-446655440002',
        amountCents: 5000,
        method: 'PIX',
        reference: 'abc123',
        note: 'Pagamento via Pix',
      },
    });
    expect(valid.success).toBe(true);

    // Invalid: negative amount
    const invalid = recordSettlementSchema.safeParse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      body: {
        fromParticipantId: '550e8400-e29b-41d4-a716-446655440001',
        toParticipantId: '550e8400-e29b-41d4-a716-446655440002',
        amountCents: -100,
        method: 'PIX',
      },
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate bill creation schema', () => {
    // using imported createBillSchema

    const valid = createBillSchema.safeParse({
      body: {
        name: 'Viagem para o Rio',
        description: 'Despesas da viagem',
        simplifyDebts: true,
      },
    });
    expect(valid.success).toBe(true);

    // Invalid: empty name
    const invalid = createBillSchema.safeParse({
      body: {
        name: '',
      },
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate add member schema with CPF', () => {
    // using imported addMemberSchema

    const valid = addMemberSchema.safeParse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      body: {
        identifierType: 'PIX_CPF',
        identifierValue: '529.982.247-25',
        displayName: 'João Silva',
      },
    });
    expect(valid.success).toBe(true);

    // Invalid CPF
    const invalid = addMemberSchema.safeParse({
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      body: {
        identifierType: 'PIX_CPF',
        identifierValue: '111.111.111-11',
      },
    });
    expect(invalid.success).toBe(false);
  });
});
