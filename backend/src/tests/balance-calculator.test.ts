import { describe, it, expect } from 'vitest'
import { calculateBalances, simplifyDebts, validateBalances } from '../services/balanceCalculator'

// Helper to create mock participant
function mockParticipant(id: string, name: string) {
  return {
    id,
    displayName: name,
    isPlaceholder: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Helper to create mock bill member
function mockMember(participantId: string, participant: ReturnType<typeof mockParticipant>) {
  return {
    id: `member-${participantId}`,
    billId: 'bill-1',
    participantId,
    participant,
    role: 'MEMBER' as const,
    joinedAt: new Date(),
  }
}

// Helper to create mock expense with splits
function mockExpense(
  payerParticipantId: string,
  amountCents: number,
  splits: Array<{ participantId: string; amountCents: number }>
) {
  return {
    id: `expense-${Math.random().toString(36).slice(2)}`,
    billId: 'bill-1',
    payerParticipantId,
    amountCents,
    description: 'Test expense',
    date: new Date(),
    splitType: 'EQUAL' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByUserId: 'user-1',
    splits: splits.map((s, i) => ({
      id: `split-${i}`,
      expenseId: 'expense-1',
      participantId: s.participantId,
      amountCents: s.amountCents,
      percentage: null,
      shares: null,
    })),
  }
}

// Helper to create mock settlement
function mockSettlement(fromParticipantId: string, toParticipantId: string, amountCents: number) {
  return {
    id: `settlement-${Math.random().toString(36).slice(2)}`,
    billId: 'bill-1',
    fromParticipantId,
    toParticipantId,
    amountCents,
    method: 'PIX' as const,
    reference: null,
    notes: null,
    createdAt: new Date(),
    createdByUserId: 'user-1',
  }
}

function makeBill(
  members: ReturnType<typeof mockMember>[],
  expenses: ReturnType<typeof mockExpense>[],
  settlements: ReturnType<typeof mockSettlement>[] = []
) {
  return {
    id: 'bill-1',
    name: 'Test Bill',
    description: null,
    currency: 'BRL',
    simplifyDebts: false,
    ownerUserId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    members,
    expenses,
    settlements,
  } as any
}

describe('Balance Calculator', () => {
  const alice = mockParticipant('alice', 'Alice')
  const bob = mockParticipant('bob', 'Bob')
  const charlie = mockParticipant('charlie', 'Charlie')

  const aliceMember = mockMember('alice', alice)
  const bobMember = mockMember('bob', bob)
  const charlieMember = mockMember('charlie', charlie)

  describe('calculateBalances', () => {
    it('should return zero balances when no expenses', () => {
      const bill = makeBill([aliceMember, bobMember], [])
      const result = calculateBalances(bill)

      expect(result.participants).toHaveLength(2)
      expect(result.participants.every(p => p.netBalance === 0)).toBe(true)
      expect(result.debts).toHaveLength(0)
      expect(validateBalances(result.participants)).toBe(true)
    })

    it('should calculate simple equal split between 2 people', () => {
      // Alice pays R$100, split equally with Bob
      const expense = mockExpense('alice', 10000, [
        { participantId: 'alice', amountCents: 5000 },
        { participantId: 'bob', amountCents: 5000 },
      ])
      const bill = makeBill([aliceMember, bobMember], [expense])
      const result = calculateBalances(bill)

      const aliceBalance = result.participants.find(p => p.participantId === 'alice')!
      const bobBalance = result.participants.find(p => p.participantId === 'bob')!

      expect(aliceBalance.totalPaid).toBe(10000)
      expect(aliceBalance.totalOwed).toBe(5000)
      expect(aliceBalance.netBalance).toBe(5000) // Alice is owed R$50
      expect(bobBalance.totalPaid).toBe(0)
      expect(bobBalance.totalOwed).toBe(5000)
      expect(bobBalance.netBalance).toBe(-5000) // Bob owes R$50

      expect(result.debts).toHaveLength(1)
      expect(result.debts[0]!.fromParticipantId).toBe('bob')
      expect(result.debts[0]!.toParticipantId).toBe('alice')
      expect(result.debts[0]!.amountCents).toBe(5000)

      expect(validateBalances(result.participants)).toBe(true)
    })

    it('should handle equal split among 3 people with remainder', () => {
      // R$100 split 3 ways = 3334 + 3333 + 3333 = 10000
      const expense = mockExpense('alice', 10000, [
        { participantId: 'alice', amountCents: 3334 },
        { participantId: 'bob', amountCents: 3333 },
        { participantId: 'charlie', amountCents: 3333 },
      ])
      const bill = makeBill([aliceMember, bobMember, charlieMember], [expense])
      const result = calculateBalances(bill)

      // Total splits should equal expense amount
      const totalOwed = result.participants.reduce((sum, p) => sum + p.totalOwed, 0)
      expect(totalOwed).toBe(10000)

      expect(validateBalances(result.participants)).toBe(true)
    })

    it('should handle multiple expenses from different payers', () => {
      const expense1 = mockExpense('alice', 6000, [
        { participantId: 'alice', amountCents: 3000 },
        { participantId: 'bob', amountCents: 3000 },
      ])
      const expense2 = mockExpense('bob', 4000, [
        { participantId: 'alice', amountCents: 2000 },
        { participantId: 'bob', amountCents: 2000 },
      ])
      const bill = makeBill([aliceMember, bobMember], [expense1, expense2])
      const result = calculateBalances(bill)

      const aliceBalance = result.participants.find(p => p.participantId === 'alice')!
      const bobBalance = result.participants.find(p => p.participantId === 'bob')!

      // Alice: paid 6000, owes 3000+2000=5000, net=+1000
      expect(aliceBalance.netBalance).toBe(1000)
      // Bob: paid 4000, owes 3000+2000=5000, net=-1000
      expect(bobBalance.netBalance).toBe(-1000)

      expect(validateBalances(result.participants)).toBe(true)
    })

    it('should handle settlements reducing debts', () => {
      const expense = mockExpense('alice', 10000, [
        { participantId: 'alice', amountCents: 5000 },
        { participantId: 'bob', amountCents: 5000 },
      ])
      // Bob pays Alice R$30
      const settlement = mockSettlement('bob', 'alice', 3000)
      const bill = makeBill([aliceMember, bobMember], [expense], [settlement])
      const result = calculateBalances(bill)

      const aliceBalance = result.participants.find(p => p.participantId === 'alice')!
      const bobBalance = result.participants.find(p => p.participantId === 'bob')!

      // Alice: paid 10000, received settlement -3000 = net paid 7000, owes 5000, net=+2000
      expect(aliceBalance.netBalance).toBe(2000)
      // Bob: paid 0 + settlement 3000 = 3000 paid, owes 5000, net=-2000
      expect(bobBalance.netBalance).toBe(-2000)

      expect(validateBalances(result.participants)).toBe(true)
    })

    it('should handle full settlement (debt fully paid)', () => {
      const expense = mockExpense('alice', 10000, [
        { participantId: 'alice', amountCents: 5000 },
        { participantId: 'bob', amountCents: 5000 },
      ])
      const settlement = mockSettlement('bob', 'alice', 5000)
      const bill = makeBill([aliceMember, bobMember], [expense], [settlement])
      const result = calculateBalances(bill)

      // After full settlement, everyone should be at 0
      expect(result.participants.every(p => p.netBalance === 0)).toBe(true)
      expect(result.debts).toHaveLength(0)
      expect(validateBalances(result.participants)).toBe(true)
    })

    it('should handle single-cent amounts', () => {
      const expense = mockExpense('alice', 1, [
        { participantId: 'alice', amountCents: 1 },
        { participantId: 'bob', amountCents: 0 },
      ])
      const bill = makeBill([aliceMember, bobMember], [expense])
      const result = calculateBalances(bill)

      expect(validateBalances(result.participants)).toBe(true)
    })

    it('should handle large amounts (R$999,999.99)', () => {
      const expense = mockExpense('alice', 99999999, [
        { participantId: 'alice', amountCents: 49999999 },
        { participantId: 'bob', amountCents: 50000000 },
      ])
      const bill = makeBill([aliceMember, bobMember], [expense])
      const result = calculateBalances(bill)

      expect(validateBalances(result.participants)).toBe(true)
    })

    it('should handle participant with no expenses', () => {
      const expense = mockExpense('alice', 10000, [
        { participantId: 'alice', amountCents: 5000 },
        { participantId: 'bob', amountCents: 5000 },
      ])
      // Charlie is a member but has no expenses
      const bill = makeBill([aliceMember, bobMember, charlieMember], [expense])
      const result = calculateBalances(bill)

      const charlieBalance = result.participants.find(p => p.participantId === 'charlie')!
      expect(charlieBalance.totalPaid).toBe(0)
      expect(charlieBalance.totalOwed).toBe(0)
      expect(charlieBalance.netBalance).toBe(0)

      expect(validateBalances(result.participants)).toBe(true)
    })
  })

  describe('simplifyDebts', () => {
    it('should return empty debts when all balances are zero', () => {
      const balanceResult = {
        participants: [
          { participantId: 'alice', participant: alice, totalPaid: 5000, totalOwed: 5000, netBalance: 0 },
          { participantId: 'bob', participant: bob, totalPaid: 5000, totalOwed: 5000, netBalance: 0 },
        ],
        debts: [],
      }
      const result = simplifyDebts(balanceResult)
      expect(result.debts).toHaveLength(0)
    })

    it('should simplify circular debts', () => {
      // A owes B R$50, B owes C R$50, C owes A R$50 => no debts needed
      const balanceResult = {
        participants: [
          { participantId: 'alice', participant: alice, totalPaid: 5000, totalOwed: 5000, netBalance: 0 },
          { participantId: 'bob', participant: bob, totalPaid: 5000, totalOwed: 5000, netBalance: 0 },
          { participantId: 'charlie', participant: charlie, totalPaid: 5000, totalOwed: 5000, netBalance: 0 },
        ],
        debts: [],
      }
      const result = simplifyDebts(balanceResult)
      expect(result.debts).toHaveLength(0)
    })

    it('should reduce 3-person debts to fewer transactions', () => {
      // Alice: +5000, Bob: -3000, Charlie: -2000
      const balanceResult = {
        participants: [
          { participantId: 'alice', participant: alice, totalPaid: 10000, totalOwed: 5000, netBalance: 5000 },
          { participantId: 'bob', participant: bob, totalPaid: 0, totalOwed: 3000, netBalance: -3000 },
          { participantId: 'charlie', participant: charlie, totalPaid: 0, totalOwed: 2000, netBalance: -2000 },
        ],
        debts: [],
      }
      const result = simplifyDebts(balanceResult)

      // Should have exactly 2 transactions: Bob->Alice R$30, Charlie->Alice R$20
      expect(result.debts).toHaveLength(2)

      const totalDebt = result.debts.reduce((sum, d) => sum + d.amountCents, 0)
      expect(totalDebt).toBe(5000)
    })

    it('should preserve total amounts after simplification', () => {
      // Complex scenario with 3 people
      const balanceResult = {
        participants: [
          { participantId: 'alice', participant: alice, totalPaid: 15000, totalOwed: 5000, netBalance: 10000 },
          { participantId: 'bob', participant: bob, totalPaid: 2000, totalOwed: 8000, netBalance: -6000 },
          { participantId: 'charlie', participant: charlie, totalPaid: 1000, totalOwed: 5000, netBalance: -4000 },
        ],
        debts: [],
      }
      const result = simplifyDebts(balanceResult)

      // Total debt paid should equal total credit
      const totalDebt = result.debts.reduce((sum, d) => sum + d.amountCents, 0)
      const totalCredit = balanceResult.participants
        .filter(p => p.netBalance > 0)
        .reduce((sum, p) => sum + p.netBalance, 0)
      expect(totalDebt).toBe(totalCredit)
    })
  })

  describe('validateBalances', () => {
    it('should return true when balances sum to zero', () => {
      const balances = [
        { participantId: 'alice', participant: alice, totalPaid: 10000, totalOwed: 5000, netBalance: 5000 },
        { participantId: 'bob', participant: bob, totalPaid: 0, totalOwed: 5000, netBalance: -5000 },
      ]
      expect(validateBalances(balances)).toBe(true)
    })

    it('should return true for rounding error of 1 cent', () => {
      const balances = [
        { participantId: 'alice', participant: alice, totalPaid: 10000, totalOwed: 3333, netBalance: 6667 },
        { participantId: 'bob', participant: bob, totalPaid: 0, totalOwed: 3333, netBalance: -3333 },
        { participantId: 'charlie', participant: charlie, totalPaid: 0, totalOwed: 3333, netBalance: -3333 },
      ]
      // 6667 - 3333 - 3333 = 1 (rounding error)
      expect(validateBalances(balances)).toBe(true)
    })

    it('should return false for imbalanced amounts', () => {
      const balances = [
        { participantId: 'alice', participant: alice, totalPaid: 10000, totalOwed: 5000, netBalance: 5000 },
        { participantId: 'bob', participant: bob, totalPaid: 0, totalOwed: 3000, netBalance: -3000 },
      ]
      // 5000 - 3000 = 2000 (too much imbalance)
      expect(validateBalances(balances)).toBe(false)
    })

    it('should return true for empty balances', () => {
      expect(validateBalances([])).toBe(true)
    })

    it('should return true for single participant with zero balance', () => {
      const balances = [
        { participantId: 'alice', participant: alice, totalPaid: 5000, totalOwed: 5000, netBalance: 0 },
      ]
      expect(validateBalances(balances)).toBe(true)
    })
  })
})
