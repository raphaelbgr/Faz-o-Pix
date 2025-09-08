import { Bill, BillMember, Expense, ExpenseSplit, Settlement, Participant } from '@prisma/client';

type BillWithData = Bill & {
  members: (BillMember & { participant: Participant })[];
  expenses: (Expense & { splits: ExpenseSplit[] })[];
  settlements: Settlement[];
};

export interface ParticipantBalance {
  participantId: string;
  participant: Participant;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive = creditor, negative = debtor
}

export interface Debt {
  fromParticipantId: string;
  fromParticipant: Participant;
  toParticipantId: string;
  toParticipant: Participant;
  amountCents: number;
}

export function calculateBalances(bill: BillWithData): {
  participants: ParticipantBalance[];
  debts: Debt[];
} {
  const participantMap = new Map<string, Participant>();
  const balances = new Map<string, { paid: number; owed: number }>();

  // Initialize participants
  for (const member of bill.members) {
    participantMap.set(member.participantId, member.participant);
    balances.set(member.participantId, { paid: 0, owed: 0 });
  }

  // Calculate from expenses
  for (const expense of bill.expenses) {
    const payerId = expense.payerParticipantId;
    const balance = balances.get(payerId);
    if (balance) {
      balance.paid += expense.amountCents;
    }

    // Add what each participant owes
    for (const split of expense.splits) {
      const splitBalance = balances.get(split.participantId);
      if (splitBalance) {
        splitBalance.owed += split.amountCents;
      }
    }
  }

  // Apply settlements
  for (const settlement of bill.settlements) {
    const fromBalance = balances.get(settlement.fromParticipantId);
    const toBalance = balances.get(settlement.toParticipantId);
    
    if (fromBalance && toBalance) {
      // From participant has "paid" this amount
      fromBalance.paid += settlement.amountCents;
      // To participant has received this amount (reduces what they paid)
      toBalance.paid -= settlement.amountCents;
    }
  }

  // Calculate net balances
  const participantBalances: ParticipantBalance[] = [];
  for (const [participantId, balance] of balances.entries()) {
    const participant = participantMap.get(participantId)!;
    const netBalance = balance.paid - balance.owed;
    
    participantBalances.push({
      participantId,
      participant,
      totalPaid: balance.paid,
      totalOwed: balance.owed,
      netBalance,
    });
  }

  // Calculate who owes whom
  const debts = calculateDebtsFromBalances(participantBalances);

  return {
    participants: participantBalances,
    debts,
  };
}

function calculateDebtsFromBalances(balances: ParticipantBalance[]): Debt[] {
  const debts: Debt[] = [];
  
  // Separate creditors and debtors
  const creditors = balances
    .filter(b => b.netBalance > 0)
    .map(b => ({ ...b, remaining: b.netBalance }))
    .sort((a, b) => b.remaining - a.remaining);
    
  const debtors = balances
    .filter(b => b.netBalance < 0)
    .map(b => ({ ...b, remaining: Math.abs(b.netBalance) }))
    .sort((a, b) => b.remaining - a.remaining);

  // Match debtors to creditors
  for (const debtor of debtors) {
    while (debtor.remaining > 0 && creditors.length > 0) {
      const creditor = creditors[0]!;
      const amount = Math.min(debtor.remaining, creditor.remaining);
      
      if (amount > 0) {
        debts.push({
          fromParticipantId: debtor.participantId,
          fromParticipant: debtor.participant,
          toParticipantId: creditor.participantId,
          toParticipant: creditor.participant,
          amountCents: amount,
        });
        
        debtor.remaining -= amount;
        creditor.remaining -= amount;
        
        if (creditor.remaining === 0) {
          creditors.shift();
        }
      }
    }
  }

  return debts;
}

export function simplifyDebts(balanceResult: {
  participants: ParticipantBalance[];
  debts: Debt[];
}): {
  participants: ParticipantBalance[];
  debts: Debt[];
} {
  // Use a greedy algorithm to minimize transactions
  const { participants } = balanceResult;
  
  // Create mutable copies of net balances
  const creditors: Array<{ id: string; participant: Participant; amount: number }> = [];
  const debtors: Array<{ id: string; participant: Participant; amount: number }> = [];
  
  for (const p of participants) {
    if (p.netBalance > 0) {
      creditors.push({
        id: p.participantId,
        participant: p.participant,
        amount: p.netBalance,
      });
    } else if (p.netBalance < 0) {
      debtors.push({
        id: p.participantId,
        participant: p.participant,
        amount: Math.abs(p.netBalance),
      });
    }
  }
  
  // Sort by amount (descending) for optimal matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  const simplifiedDebts: Debt[] = [];
  
  // Greedy matching algorithm
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]!;
    const debtor = debtors[j]!;
    
    const amount = Math.min(creditor.amount, debtor.amount);
    
    if (amount > 0) {
      simplifiedDebts.push({
        fromParticipantId: debtor.id,
        fromParticipant: debtor.participant,
        toParticipantId: creditor.id,
        toParticipant: creditor.participant,
        amountCents: amount,
      });
    }
    
    creditor.amount -= amount;
    debtor.amount -= amount;
    
    if (creditor.amount === 0) i++;
    if (debtor.amount === 0) j++;
  }
  
  return {
    participants,
    debts: simplifiedDebts,
  };
}

// Validation function to ensure balances are consistent
export function validateBalances(balances: ParticipantBalance[]): boolean {
  const totalNet = balances.reduce((sum, b) => sum + b.netBalance, 0);
  // Should sum to zero (within rounding error of 1 cent)
  return Math.abs(totalNet) <= 1;
}