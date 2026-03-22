import { PrismaClient } from '@prisma/client';
import { normalizeIdentifier, hashIdentifier } from '../utils/validation';

export interface ClaimableMatch {
  participantId: string;
  identifierType: string;
  identifierValue: string;
  bills: Array<{
    id: string;
    name: string;
    ownerName: string;
    joinedAt: Date;
  }>;
}

export interface ClaimingResult {
  claimedCount: number;
  totalBills: number;
  totalExpenses: number;
  totalSettlements: number;
  bills: Array<{
    billId: string;
    billName: string;
    billOwnerName: string;
    participantSince: string;
    expenseCount: number;
    settlementCount: number;
    currentBalance: number;
    lastActivity: string | null;
  }>;
  financialSummary: {
    totalPaid: number;
    totalOwed: number;
    netBalance: number;
    activeDebts: number;
    settledBills: number;
  };
}

export interface ParticipantBalanceInfo {
  totalPaid: number;
  totalOwed: number;
  settlementAdjustments: number;
  netBalance: number;
}

/**
 * Find all claimable placeholder participants for a user's identifiers
 */
export async function findClaimablePlaceholders(
  prisma: PrismaClient,
  identifiers: Array<{ type: string; value: string }>
): Promise<ClaimableMatch[]> {
  const claimableMatches: ClaimableMatch[] = [];

  for (const identifier of identifiers) {
    // Map the identifier type from request format to database format
    const dbType = identifier.type.startsWith('PIX_') ? identifier.type : `PIX_${identifier.type}`;
    const normalizedValue = normalizeIdentifier(dbType, identifier.value);
    
    // Find participant identifiers with matching value
    const participantIdentifiers = await prisma.participantIdentifier.findMany({
      where: {
        value: normalizedValue
      }
    });

    // Check which participants are unclaimed (no userLink)
    for (const pi of participantIdentifiers) {
      const userLink = await prisma.userParticipantLink.findUnique({
        where: { participantId: pi.participantId }
      });
      
      // Skip if already claimed
      if (userLink) continue;

      // Get participant
      const participant = await prisma.participant.findUnique({
        where: { id: pi.participantId }
      });
      
      if (!participant) continue;

      // Get bill memberships for this participant
      const billMembers = await prisma.billMember.findMany({
        where: { participantId: participant.id }
      });

      const bills = [];
      for (const billMember of billMembers) {
        const bill = await prisma.bill.findUnique({
          where: { id: billMember.billId }
        });
        
        if (bill) {
          const owner = await prisma.user.findUnique({
            where: { id: bill.ownerUserId }
          });
          
          bills.push({
            id: bill.id,
            name: bill.name,
            ownerName: owner?.fullName || 'Unknown',
            joinedAt: billMember.createdAt,
          });
        }
      }

      // Only add if participant has bills
      if (bills.length > 0) {
        claimableMatches.push({
          participantId: participant.id,
          identifierType: identifier.type,
          identifierValue: identifier.value,
          bills,
        });
      }
    }
  }

  return claimableMatches;
}

/**
 * Claim placeholder participants by linking them to a user
 */
export async function claimPlaceholderParticipants(
  prisma: PrismaClient,
  userId: string,
  claimableMatches: ClaimableMatch[]
): Promise<ClaimingResult> {
  const result: ClaimingResult = {
    claimedCount: 0,
    totalBills: 0,
    totalExpenses: 0,
    totalSettlements: 0,
    bills: [],
    financialSummary: {
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
      activeDebts: 0,
      settledBills: 0,
    },
  };

  for (const match of claimableMatches) {
    // Create user-participant link
    await prisma.userParticipantLink.create({
      data: {
        userId,
        participantId: match.participantId,
      },
    });

    result.claimedCount++;
    result.totalBills += match.bills.length;

    // Calculate financial information for each bill
    for (const bill of match.bills) {
      const expensesPaid = await prisma.expense.findMany({
        where: {
          billId: bill.id,
          payerParticipantId: match.participantId,
        },
      });

      const expenseSplits = await prisma.expenseSplit.findMany({
        where: {
          participantId: match.participantId,
        },
      });

      const settlementsFrom = await prisma.settlement.findMany({
        where: {
          billId: bill.id,
          fromParticipantId: match.participantId,
        },
      });

      const settlementsTo = await prisma.settlement.findMany({
        where: {
          billId: bill.id,
          toParticipantId: match.participantId,
        },
      });

      const totalPaid = expensesPaid.reduce((sum, exp) => sum + exp.amountCents, 0);
      const totalOwed = expenseSplits.reduce((sum, split) => sum + split.amountCents, 0);
      const settlementsReceived = settlementsTo.reduce((sum, s) => sum + s.amountCents, 0);
      const settlementsPaid = settlementsFrom.reduce((sum, s) => sum + s.amountCents, 0);
      
      const currentBalance = totalPaid - totalOwed + settlementsReceived - settlementsPaid;

      // Find last activity
      const lastExpense = expensesPaid.length > 0 ? 
        Math.max(...expensesPaid.map(e => e.createdAt.getTime())) : 0;
      const lastSettlement = [...settlementsFrom, ...settlementsTo].length > 0 ?
        Math.max(...[...settlementsFrom, ...settlementsTo].map(s => s.createdAt.getTime())) : 0;
      const lastActivityTime = Math.max(lastExpense, lastSettlement);

      result.bills.push({
        billId: bill.id,
        billName: bill.name,
        billOwnerName: bill.ownerName,
        participantSince: bill.joinedAt.toISOString(),
        expenseCount: expensesPaid.length,
        settlementCount: settlementsFrom.length + settlementsTo.length,
        currentBalance,
        lastActivity: lastActivityTime > 0 ? new Date(lastActivityTime).toISOString() : null,
      });

      // Accumulate totals
      result.totalExpenses += expensesPaid.length;
      result.totalSettlements += settlementsFrom.length + settlementsTo.length;
      result.financialSummary.totalPaid += totalPaid;
      result.financialSummary.totalOwed += totalOwed;
    }
  }

  result.financialSummary.netBalance = 
    result.financialSummary.totalPaid - result.financialSummary.totalOwed;
  result.financialSummary.activeDebts = result.bills.filter(b => b.currentBalance < 0).length;
  result.financialSummary.settledBills = result.bills.filter(b => b.currentBalance === 0).length;

  return result;
}