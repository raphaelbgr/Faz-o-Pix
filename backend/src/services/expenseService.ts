import { PrismaClient, ShareType, Prisma } from '@prisma/client';

export interface ExpenseSplitInput {
  participantId: string;
  percentage?: number;
  shares?: number;
}

export interface CreateExpenseInput {
  billId: string;
  payerParticipantId: string;
  amountCents: number;
  description: string;
  spentAt: Date;
  splitType: 'equal' | 'percentage' | 'shares';
  splits: ExpenseSplitInput[];
}

export interface CalculatedSplit {
  participantId: string;
  amountCents: number;
  shareType: ShareType;
  shareValue: number;
}

export interface ExpenseCreationResult {
  expenseId: string;
  totalAmount: number;
  splits: Array<{
    participantId: string;
    participantName: string;
    amountCents: number;
    percentage?: number;
    shares?: number;
  }>;
  balanceImpact: Array<{
    participantId: string;
    participantName: string;
    balanceChange: number;
  }>;
}

/**
 * Calculate equal split distribution
 * Uses largest remainder method to fairly distribute rounding
 */
export function calculateEqualSplit(
  totalCents: number,
  participantIds: string[]
): CalculatedSplit[] {
  if (participantIds.length === 0) {
    throw new Error('At least one participant is required');
  }

  if (totalCents <= 0) {
    throw new Error('Total amount must be positive');
  }

  const participantCount = participantIds.length;
  const baseAmount = Math.floor(totalCents / participantCount);
  const remainder = totalCents % participantCount;

  const splits: CalculatedSplit[] = [];

  // Distribute base amount to all participants
  for (let i = 0; i < participantCount; i++) {
    const participantId = participantIds[i];
    let amount = baseAmount;

    // Distribute remainder cents to first N participants
    // This ensures fair distribution using largest remainder method
    if (i < remainder) {
      amount += 1;
    }

    splits.push({
      participantId,
      amountCents: amount,
      shareType: ShareType.EQUAL,
      shareValue: 1.0 / participantCount
    });
  }

  // Verify total matches (mathematical invariant)
  const calculatedTotal = splits.reduce((sum, split) => sum + split.amountCents, 0);
  if (calculatedTotal !== totalCents) {
    throw new Error(`Split calculation error: ${calculatedTotal} !== ${totalCents}`);
  }

  return splits;
}

/**
 * Calculate percentage-based split distribution
 * Handles rounding by adjusting the last participant's amount
 */
export function calculatePercentageSplit(
  totalCents: number,
  percentageSplits: Array<{ participantId: string; percentage: number }>
): CalculatedSplit[] {
  if (percentageSplits.length === 0) {
    throw new Error('At least one participant is required');
  }

  if (totalCents <= 0) {
    throw new Error('Total amount must be positive');
  }

  // Validate percentages sum to 100%
  const totalPercentage = percentageSplits.reduce((sum, split) => sum + split.percentage, 0);
  const tolerance = 0.01; // Allow 0.01% tolerance for floating point precision

  if (Math.abs(totalPercentage - 100) > tolerance) {
    throw new Error(
      `Percentages must sum to 100%, got ${totalPercentage.toFixed(2)}%`
    );
  }

  // Validate individual percentages
  for (const split of percentageSplits) {
    if (split.percentage <= 0 || split.percentage > 100) {
      throw new Error('All percentages must be between 0% and 100%');
    }
  }

  const splits: CalculatedSplit[] = [];
  let allocatedCents = 0;

  // Calculate amounts for all but last participant
  for (let i = 0; i < percentageSplits.length - 1; i++) {
    const split = percentageSplits[i];
    const amount = Math.round(totalCents * split.percentage / 100);

    splits.push({
      participantId: split.participantId,
      amountCents: amount,
      shareType: ShareType.PERCENT,
      shareValue: split.percentage / 100
    });

    allocatedCents += amount;
  }

  // Last participant gets remainder to ensure exact total
  const lastSplit = percentageSplits[percentageSplits.length - 1];
  const lastAmount = totalCents - allocatedCents;

  splits.push({
    participantId: lastSplit.participantId,
    amountCents: lastAmount,
    shareType: ShareType.PERCENT,
    shareValue: lastSplit.percentage / 100
  });

  // Verify total matches (mathematical invariant)
  const calculatedTotal = splits.reduce((sum, split) => sum + split.amountCents, 0);
  if (calculatedTotal !== totalCents) {
    throw new Error(`Percentage split calculation error: ${calculatedTotal} !== ${totalCents}`);
  }

  return splits;
}

/**
 * Calculate custom shares-based split distribution
 * Handles proportional distribution with rounding adjustments
 */
export function calculateSharesSplit(
  totalCents: number,
  sharesSplits: Array<{ participantId: string; shares: number }>
): CalculatedSplit[] {
  if (sharesSplits.length === 0) {
    throw new Error('At least one participant is required');
  }

  if (totalCents <= 0) {
    throw new Error('Total amount must be positive');
  }

  // Validate shares
  for (const split of sharesSplits) {
    if (!Number.isInteger(split.shares) || split.shares <= 0) {
      throw new Error('All shares must be positive integers');
    }
  }

  // Calculate total shares
  const totalShares = sharesSplits.reduce((sum, split) => sum + split.shares, 0);

  const splits: CalculatedSplit[] = [];
  let allocatedCents = 0;

  // Calculate amounts for all but last participant
  for (let i = 0; i < sharesSplits.length - 1; i++) {
    const split = sharesSplits[i];
    const amount = Math.round(totalCents * split.shares / totalShares);

    splits.push({
      participantId: split.participantId,
      amountCents: amount,
      shareType: ShareType.SHARES,
      shareValue: split.shares
    });

    allocatedCents += amount;
  }

  // Last participant gets remainder to ensure exact total
  const lastSplit = sharesSplits[sharesSplits.length - 1];
  const lastAmount = totalCents - allocatedCents;

  splits.push({
    participantId: lastSplit.participantId,
    amountCents: lastAmount,
    shareType: ShareType.SHARES,
    shareValue: lastSplit.shares
  });

  // Verify total matches (mathematical invariant)
  const calculatedTotal = splits.reduce((sum, split) => sum + split.amountCents, 0);
  if (calculatedTotal !== totalCents) {
    throw new Error(`Shares split calculation error: ${calculatedTotal} !== ${totalCents}`);
  }

  return splits;
}

/**
 * Create expense with atomic transaction
 * Handles all split types and balance updates
 */
export async function createExpense(
  prisma: PrismaClient,
  input: CreateExpenseInput,
  userId: string
): Promise<ExpenseCreationResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate bill exists and user has access
    // First get user's participant
    const userParticipantLink = await tx.userParticipantLink.findUnique({
      where: { userId }
    });

    if (!userParticipantLink) {
      throw new Error('User participant not found');
    }

    // Then check if user is a member of this bill
    const billMember = await tx.billMember.findFirst({
      where: {
        billId: input.billId,
        participantId: userParticipantLink.participantId
      }
    });

    if (!billMember) {
      throw new Error('You do not have permission to add expenses to this bill');
    }

    // 2. Validate payer is bill member (if payer is specified)
    if (input.payerParticipantId) {
      const payerIsMember = await tx.billMember.findFirst({
        where: {
          billId: input.billId,
          participantId: input.payerParticipantId
        }
      });

      if (!payerIsMember) {
        throw new Error('Payer must be a member of this bill');
      }
    }

    // 3. Get split participants (removed bill membership constraint)
    const splitParticipantIds = input.splits.map(s => s.participantId);
    console.log('Getting split participant IDs:', splitParticipantIds);
    
    // Get participant details directly
    const participants = await tx.participant.findMany({
      where: {
        id: { in: splitParticipantIds }
      }
    });

    if (participants.length !== splitParticipantIds.length) {
      throw new Error('Some split participants do not exist');
    }

    // 4. Calculate splits based on type
    let calculatedSplits: CalculatedSplit[];

    switch (input.splitType) {
      case 'equal':
        calculatedSplits = calculateEqualSplit(input.amountCents, splitParticipantIds);
        break;
      case 'percentage':
        calculatedSplits = calculatePercentageSplit(
          input.amountCents,
          input.splits.map(s => ({
            participantId: s.participantId,
            percentage: s.percentage!
          }))
        );
        break;
      case 'shares':
        calculatedSplits = calculateSharesSplit(
          input.amountCents,
          input.splits.map(s => ({
            participantId: s.participantId,
            shares: s.shares!
          }))
        );
        break;
      default:
        throw new Error('Invalid split type');
    }

    // 5. Create expense record
    const expense = await tx.expense.create({
      data: {
        billId: input.billId,
        payerParticipantId: input.payerParticipantId,
        amountCents: input.amountCents,
        description: input.description,
        spentAt: input.spentAt
      }
    });

    // 6. Create expense splits (batch insert for performance)
    const expenseSplitsData = calculatedSplits.map(split => ({
      expenseId: expense.id,
      participantId: split.participantId,
      shareType: split.shareType,
      shareValue: new Prisma.Decimal(split.shareValue),
      amountCents: split.amountCents
    }));

    await tx.expenseSplit.createMany({
      data: expenseSplitsData
    });

    // 7. Update bill's last activity
    await tx.bill.update({
      where: { id: input.billId },
      data: { updatedAt: new Date() }
    });

    // 8. Create changelog entry
    await tx.billChangelog.create({
      data: {
        billId: input.billId,
        userId: userId,
        action: 'EXPENSE_ADDED',
        entityType: 'EXPENSE',
        entityId: expense.id,
        description: `Added expense: ${input.description}`,
        metadata: {
          amount: input.amountCents,
          splitType: input.splitType,
          participantCount: calculatedSplits.length
        }
      }
    });

    // 9. Calculate balance impact (simplified - full balance calculation would be in separate service)
    const balanceImpact = calculatedSplits.map(split => {
      const participant = participants.find(p => p.participantId === split.participantId);
      const balanceChange = input.payerParticipantId && split.participantId === input.payerParticipantId
        ? input.amountCents - split.amountCents  // Payer: paid amount - owed amount
        : -split.amountCents;                     // Others: -owed amount

      return {
        participantId: split.participantId,
        participantName: participant?.participant?.displayName || 'Unknown',
        balanceChange
      };
    });

    // 10. Build response with split details
    const responseData: ExpenseCreationResult = {
      expenseId: expense.id,
      totalAmount: input.amountCents,
      splits: calculatedSplits.map(split => {
        const participant = participants.find(p => p.participantId === split.participantId);
        const originalSplit = input.splits.find(s => s.participantId === split.participantId);
        
        return {
          participantId: split.participantId,
          participantName: participant?.participant?.displayName || 'Unknown',
          amountCents: split.amountCents,
          percentage: originalSplit?.percentage,
          shares: originalSplit?.shares
        };
      }),
      balanceImpact
    };

    return responseData;
  });
}