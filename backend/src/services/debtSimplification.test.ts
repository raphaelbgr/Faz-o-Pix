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

describe('Debt Simplification Algorithm - Advanced Cases', () => {
  it('should handle 5-person complex expense scenario', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
        { id: 'p4', name: 'Dave' },
        { id: 'p5', name: 'Eve' },
      ],
      expenses: [
        {
          payerId: 'p1',
          amountCents: 5000,
          splits: [
            { participantId: 'p1', amountCents: 1000 },
            { participantId: 'p2', amountCents: 1000 },
            { participantId: 'p3', amountCents: 1000 },
            { participantId: 'p4', amountCents: 1000 },
            { participantId: 'p5', amountCents: 1000 },
          ],
        },
        {
          payerId: 'p2',
          amountCents: 3000,
          splits: [
            { participantId: 'p1', amountCents: 1000 },
            { participantId: 'p2', amountCents: 1000 },
            { participantId: 'p3', amountCents: 1000 },
          ],
        },
        {
          payerId: 'p3',
          amountCents: 2000,
          splits: [
            { participantId: 'p4', amountCents: 1000 },
            { participantId: 'p5', amountCents: 1000 },
          ],
        },
      ],
    });

    const result = calculateBalances(bill);
    expect(validateBalances(result.participants)).toBe(true);

    const simplified = simplifyDebts(result);
    const totalSimplified = simplified.debts.reduce((sum, d) => sum + d.amountCents, 0);
    const totalOriginal = result.debts.reduce((sum, d) => sum + d.amountCents, 0);
    expect(totalSimplified).toBe(totalOriginal);
    // Simplified should have fewer or equal transactions
    expect(simplified.debts.length).toBeLessThanOrEqual(result.debts.length);
  });

  it('should handle multiple settlements reducing debts progressively', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
      ],
      expenses: [
        {
          payerId: 'p1',
          amountCents: 9000,
          splits: [
            { participantId: 'p1', amountCents: 3000 },
            { participantId: 'p2', amountCents: 3000 },
            { participantId: 'p3', amountCents: 3000 },
          ],
        },
      ],
      settlements: [
        { fromId: 'p2', toId: 'p1', amountCents: 1000 },
        { fromId: 'p3', toId: 'p1', amountCents: 2000 },
      ],
    });

    const result = calculateBalances(bill);

    const alice = result.participants.find(p => p.participantId === 'p1')!;
    const bob = result.participants.find(p => p.participantId === 'p2')!;
    const carol = result.participants.find(p => p.participantId === 'p3')!;

    // Alice: paid 9000-1000-2000=6000 (settlements reduce "paid"), owes 3000, net = 3000
    expect(alice.netBalance).toBe(3000);
    // Bob: paid 0+1000=1000, owes 3000, net = -2000
    expect(bob.netBalance).toBe(-2000);
    // Carol: paid 0+2000=2000, owes 3000, net = -1000
    expect(carol.netBalance).toBe(-1000);
    expect(validateBalances(result.participants)).toBe(true);
  });

  it('should handle bill with only one expense and one person paying everything', () => {
    const bill = makeBill({
      members: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      expenses: [
        {
          payerId: 'p1',
          amountCents: 10000,
          splits: [
            { participantId: 'p2', amountCents: 10000 },
          ],
        },
      ],
    });

    const result = calculateBalances(bill);
    expect(result.debts).toHaveLength(1);
    expect(result.debts[0]!.fromParticipantId).toBe('p2');
    expect(result.debts[0]!.toParticipantId).toBe('p1');
    expect(result.debts[0]!.amountCents).toBe(10000);
  });

  it('should handle overpayment settlement gracefully', () => {
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
        // Bob overpays — settles more than owed
        { fromId: 'p2', toId: 'p1', amountCents: 700 },
      ],
    });

    const result = calculateBalances(bill);
    // Now Alice owes Bob
    const alice = result.participants.find(p => p.participantId === 'p1')!;
    const bob = result.participants.find(p => p.participantId === 'p2')!;
    expect(alice.netBalance).toBe(-200);
    expect(bob.netBalance).toBe(200);
  });

  it('should simplify a chain debt (A→B→C becomes A→C)', () => {
    // Net: A = -500, B = 0, C = +500
    const participants: ParticipantBalance[] = [
      { participantId: 'pA', participant: { id: 'pA', displayName: 'A', createdAt: new Date() }, totalPaid: 0, totalOwed: 500, netBalance: -500 },
      { participantId: 'pB', participant: { id: 'pB', displayName: 'B', createdAt: new Date() }, totalPaid: 500, totalOwed: 500, netBalance: 0 },
      { participantId: 'pC', participant: { id: 'pC', displayName: 'C', createdAt: new Date() }, totalPaid: 500, totalOwed: 0, netBalance: 500 },
    ];

    const result = simplifyDebts({ participants, debts: [] });
    expect(result.debts).toHaveLength(1);
    expect(result.debts[0]!.fromParticipantId).toBe('pA');
    expect(result.debts[0]!.toParticipantId).toBe('pC');
    expect(result.debts[0]!.amountCents).toBe(500);
  });

  it('should handle 10 participants with varied balances', () => {
    const participants: ParticipantBalance[] = [];
    let totalBalance = 0;

    for (let i = 0; i < 9; i++) {
      const balance = (i % 2 === 0 ? 1 : -1) * (i + 1) * 100;
      totalBalance += balance;
      participants.push({
        participantId: `p${i}`,
        participant: { id: `p${i}`, displayName: `Person ${i}`, createdAt: new Date() },
        totalPaid: balance > 0 ? balance : 0,
        totalOwed: balance < 0 ? Math.abs(balance) : 0,
        netBalance: balance,
      });
    }

    // Add a balancing participant
    participants.push({
      participantId: 'p9',
      participant: { id: 'p9', displayName: 'Person 9', createdAt: new Date() },
      totalPaid: totalBalance < 0 ? Math.abs(totalBalance) : 0,
      totalOwed: totalBalance > 0 ? totalBalance : 0,
      netBalance: -totalBalance,
    });

    const result = simplifyDebts({ participants, debts: [] });

    // Total debts should be preserved
    const totalCredits = participants.filter(p => p.netBalance > 0).reduce((s, p) => s + p.netBalance, 0);
    const totalDebts = result.debts.reduce((s, d) => s + d.amountCents, 0);
    expect(totalDebts).toBe(totalCredits);
  });
});
