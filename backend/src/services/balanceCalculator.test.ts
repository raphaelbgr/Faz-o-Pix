import { describe, it, expect } from 'vitest';
import { calculateBalances, simplifyDebts, validateBalances, ParticipantBalance } from './balanceCalculator';

// Helper to build test data
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
}) {
  return {
    id: 'bill-1',
    ownerUserId: 'user-1',
    name: 'Test Bill',
    description: null,
    currency: 'BRL',
    simplifyDebts: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: opts.members.map((m) => ({
      id: `member-${m.id}`,
      billId: 'bill-1',
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
      billId: 'bill-1',
      payerParticipantId: e.payerId,
      amountCents: e.amountCents,
      description: null,
      spentAt: new Date(),
      createdAt: new Date(),
      splits: e.splits.map((s, j) => ({
        id: `split-${i}-${j}`,
        expenseId: `expense-${i}`,
        participantId: s.participantId,
        shareType: 'EQUAL' as const,
        shareValue: new (require('@prisma/client').Prisma.Decimal)(1),
        amountCents: s.amountCents,
      })),
    })),
    settlements: (opts.settlements || []).map((s, i) => ({
      id: `settlement-${i}`,
      billId: 'bill-1',
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

describe('calculateBalances', () => {
  it('should handle empty bill with no expenses', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      expenses: [],
    });

    const result = calculateBalances(bill);
    expect(result.participants).toHaveLength(2);
    expect(result.participants.every((p) => p.netBalance === 0)).toBe(true);
    expect(result.debts).toHaveLength(0);
  });

  it('should calculate simple equal split between 2 people', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      expenses: [
        {
          payerId: 'p1',
          amountCents: 1000,
          splits: [
            { participantId: 'p1', amountCents: 500 },
            { participantId: 'p2', amountCents: 500 },
          ],
        },
      ],
    });

    const result = calculateBalances(bill);

    const alice = result.participants.find((p) => p.participantId === 'p1')!;
    const bob = result.participants.find((p) => p.participantId === 'p2')!;

    expect(alice.totalPaid).toBe(1000);
    expect(alice.totalOwed).toBe(500);
    expect(alice.netBalance).toBe(500); // Alice is owed 500

    expect(bob.totalPaid).toBe(0);
    expect(bob.totalOwed).toBe(500);
    expect(bob.netBalance).toBe(-500); // Bob owes 500

    expect(result.debts).toHaveLength(1);
    expect(result.debts[0]!.fromParticipantId).toBe('p2');
    expect(result.debts[0]!.toParticipantId).toBe('p1');
    expect(result.debts[0]!.amountCents).toBe(500);
  });

  it('should handle multiple expenses with 3 people', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
      ],
      expenses: [
        {
          payerId: 'p1',
          amountCents: 3000,
          splits: [
            { participantId: 'p1', amountCents: 1000 },
            { participantId: 'p2', amountCents: 1000 },
            { participantId: 'p3', amountCents: 1000 },
          ],
        },
        {
          payerId: 'p2',
          amountCents: 600,
          splits: [
            { participantId: 'p1', amountCents: 200 },
            { participantId: 'p2', amountCents: 200 },
            { participantId: 'p3', amountCents: 200 },
          ],
        },
      ],
    });

    const result = calculateBalances(bill);

    const alice = result.participants.find((p) => p.participantId === 'p1')!;
    const bob = result.participants.find((p) => p.participantId === 'p2')!;
    const carol = result.participants.find((p) => p.participantId === 'p3')!;

    // Alice: paid 3000, owes 1200, net = +1800
    expect(alice.netBalance).toBe(1800);
    // Bob: paid 600, owes 1200, net = -600
    expect(bob.netBalance).toBe(-600);
    // Carol: paid 0, owes 1200, net = -1200
    expect(carol.netBalance).toBe(-1200);

    // Zero-sum check
    expect(validateBalances(result.participants)).toBe(true);
  });

  it('should apply settlements correctly', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      expenses: [
        {
          payerId: 'p1',
          amountCents: 1000,
          splits: [
            { participantId: 'p1', amountCents: 500 },
            { participantId: 'p2', amountCents: 500 },
          ],
        },
      ],
      settlements: [
        { fromId: 'p2', toId: 'p1', amountCents: 300 },
      ],
    });

    const result = calculateBalances(bill);

    const alice = result.participants.find((p) => p.participantId === 'p1')!;
    const bob = result.participants.find((p) => p.participantId === 'p2')!;

    // Alice: paid 1000, received settlement -300, owes 500, net = 1000-300-500 = 200
    expect(alice.netBalance).toBe(200);
    // Bob: paid 0+300, owes 500, net = 300-500 = -200
    expect(bob.netBalance).toBe(-200);
  });

  it('should handle fully settled bill', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      expenses: [
        {
          payerId: 'p1',
          amountCents: 1000,
          splits: [
            { participantId: 'p1', amountCents: 500 },
            { participantId: 'p2', amountCents: 500 },
          ],
        },
      ],
      settlements: [
        { fromId: 'p2', toId: 'p1', amountCents: 500 },
      ],
    });

    const result = calculateBalances(bill);
    expect(result.debts).toHaveLength(0);
  });

  it('should handle expense where payer pays for self only', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      expenses: [
        {
          payerId: 'p1',
          amountCents: 1000,
          splits: [
            { participantId: 'p1', amountCents: 1000 },
          ],
        },
      ],
    });

    const result = calculateBalances(bill);
    const alice = result.participants.find((p) => p.participantId === 'p1')!;
    expect(alice.netBalance).toBe(0);
    expect(result.debts).toHaveLength(0);
  });
});

describe('simplifyDebts', () => {
  it('should simplify debts with 3 participants', () => {
    const participants: ParticipantBalance[] = [
      { participantId: 'p1', participant: { id: 'p1', displayName: 'Alice', createdAt: new Date() }, totalPaid: 3000, totalOwed: 1000, netBalance: 2000 },
      { participantId: 'p2', participant: { id: 'p2', displayName: 'Bob', createdAt: new Date() }, totalPaid: 0, totalOwed: 1000, netBalance: -1000 },
      { participantId: 'p3', participant: { id: 'p3', displayName: 'Carol', createdAt: new Date() }, totalPaid: 0, totalOwed: 1000, netBalance: -1000 },
    ];

    const result = simplifyDebts({ participants, debts: [] });

    // Should produce 2 debts: Bob->Alice 1000, Carol->Alice 1000
    expect(result.debts).toHaveLength(2);
    const totalDebt = result.debts.reduce((sum, d) => sum + d.amountCents, 0);
    expect(totalDebt).toBe(2000);
  });

  it('should handle circular debts', () => {
    // A owes B, B owes C, C owes A - after simplification should reduce
    const participants: ParticipantBalance[] = [
      { participantId: 'p1', participant: { id: 'p1', displayName: 'A', createdAt: new Date() }, totalPaid: 1000, totalOwed: 1500, netBalance: -500 },
      { participantId: 'p2', participant: { id: 'p2', displayName: 'B', createdAt: new Date() }, totalPaid: 2000, totalOwed: 1500, netBalance: 500 },
      { participantId: 'p3', participant: { id: 'p3', displayName: 'C', createdAt: new Date() }, totalPaid: 0, totalOwed: 0, netBalance: 0 },
    ];

    const result = simplifyDebts({ participants, debts: [] });

    // Only A owes B 500, C has 0 balance
    expect(result.debts).toHaveLength(1);
    expect(result.debts[0]!.fromParticipantId).toBe('p1');
    expect(result.debts[0]!.toParticipantId).toBe('p2');
    expect(result.debts[0]!.amountCents).toBe(500);
  });

  it('should preserve zero-sum with many participants', () => {
    const participants: ParticipantBalance[] = [
      { participantId: 'p1', participant: { id: 'p1', displayName: 'A', createdAt: new Date() }, totalPaid: 5000, totalOwed: 1000, netBalance: 4000 },
      { participantId: 'p2', participant: { id: 'p2', displayName: 'B', createdAt: new Date() }, totalPaid: 0, totalOwed: 1000, netBalance: -1000 },
      { participantId: 'p3', participant: { id: 'p3', displayName: 'C', createdAt: new Date() }, totalPaid: 0, totalOwed: 1000, netBalance: -1000 },
      { participantId: 'p4', participant: { id: 'p4', displayName: 'D', createdAt: new Date() }, totalPaid: 0, totalOwed: 1000, netBalance: -1000 },
      { participantId: 'p5', participant: { id: 'p5', displayName: 'E', createdAt: new Date() }, totalPaid: 0, totalOwed: 1000, netBalance: -1000 },
    ];

    const result = simplifyDebts({ participants, debts: [] });

    // Total payments out should equal total credits
    const totalDebts = result.debts.reduce((sum, d) => sum + d.amountCents, 0);
    expect(totalDebts).toBe(4000);
    expect(result.debts.length).toBeLessThanOrEqual(4);
  });

  it('should return no debts when everyone is settled', () => {
    const participants: ParticipantBalance[] = [
      { participantId: 'p1', participant: { id: 'p1', displayName: 'A', createdAt: new Date() }, totalPaid: 1000, totalOwed: 1000, netBalance: 0 },
      { participantId: 'p2', participant: { id: 'p2', displayName: 'B', createdAt: new Date() }, totalPaid: 1000, totalOwed: 1000, netBalance: 0 },
    ];

    const result = simplifyDebts({ participants, debts: [] });
    expect(result.debts).toHaveLength(0);
  });
});

describe('validateBalances', () => {
  it('should return true for zero-sum balances', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'p1', participant: { id: 'p1', displayName: 'A', createdAt: new Date() }, totalPaid: 1000, totalOwed: 500, netBalance: 500 },
      { participantId: 'p2', participant: { id: 'p2', displayName: 'B', createdAt: new Date() }, totalPaid: 0, totalOwed: 500, netBalance: -500 },
    ];
    expect(validateBalances(balances)).toBe(true);
  });

  it('should return true within 1 cent rounding tolerance', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'p1', participant: { id: 'p1', displayName: 'A', createdAt: new Date() }, totalPaid: 1000, totalOwed: 500, netBalance: 501 },
      { participantId: 'p2', participant: { id: 'p2', displayName: 'B', createdAt: new Date() }, totalPaid: 0, totalOwed: 500, netBalance: -500 },
    ];
    expect(validateBalances(balances)).toBe(true);
  });

  it('should return false for unbalanced amounts', () => {
    const balances: ParticipantBalance[] = [
      { participantId: 'p1', participant: { id: 'p1', displayName: 'A', createdAt: new Date() }, totalPaid: 1000, totalOwed: 500, netBalance: 500 },
      { participantId: 'p2', participant: { id: 'p2', displayName: 'B', createdAt: new Date() }, totalPaid: 0, totalOwed: 500, netBalance: -100 },
    ];
    expect(validateBalances(balances)).toBe(false);
  });
});
