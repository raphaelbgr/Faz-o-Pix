import { PrismaClient } from '@prisma/client';

/**
 * Service for handling simple delete operations
 * All tables are independent - no foreign key constraints
 */
export class DeleteService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Delete participant and optionally clean up related data
   */
  async deleteParticipant(participantId: string, cleanupRelated = false): Promise<void> {
    if (cleanupRelated) {
      // Clean up related data first (optional)
      await this.prisma.userParticipantLink.deleteMany({ where: { participantId } });
      await this.prisma.billMember.deleteMany({ where: { participantId } });
      await this.prisma.participantIdentifier.deleteMany({ where: { participantId } });
      // Get expenses paid by this participant to delete splits
      const participantExpenses = await this.prisma.expense.findMany({
        where: { payerParticipantId: participantId },
        select: { id: true }
      });
      const participantExpenseIds = participantExpenses.map(e => e.id);
      
      if (participantExpenseIds.length > 0) {
        await this.prisma.expenseSplit.deleteMany({ where: { expenseId: { in: participantExpenseIds } } });
      }
      
      await this.prisma.expenseSplit.deleteMany({ where: { participantId } });
      await this.prisma.expense.deleteMany({ where: { payerParticipantId: participantId } });
      await this.prisma.settlement.deleteMany({ 
        where: { 
          OR: [
            { fromParticipantId: participantId },
            { toParticipantId: participantId }
          ]
        }
      });
    }

    // Delete participant - no constraints to worry about
    await this.prisma.participant.delete({ where: { id: participantId } });
  }

  /**
   * Delete user and optionally clean up related data
   */
  async deleteUser(userId: string, cleanupRelated = false): Promise<void> {
    if (cleanupRelated) {
      // Clean up related data first (optional)
      await this.prisma.identifier.deleteMany({ where: { userId } });
      await this.prisma.session.deleteMany({ where: { userId } });
      await this.prisma.userParticipantLink.deleteMany({ where: { userId } });
      await this.prisma.bill.deleteMany({ where: { ownerUserId: userId } });
      await this.prisma.billChangelog.deleteMany({ where: { userId } });
    }

    // Delete user - no constraints to worry about
    await this.prisma.user.delete({ where: { id: userId } });
  }

  /**
   * Delete bill and optionally clean up related data
   */
  async deleteBill(billId: string, cleanupRelated = false): Promise<void> {
    if (cleanupRelated) {
      // Clean up related data first (optional)
      await this.prisma.billChangelog.deleteMany({ where: { billId } });
      await this.prisma.settlement.deleteMany({ where: { billId } });
      // Get expense IDs from this bill, then delete splits
      const billExpenses = await this.prisma.expense.findMany({
        where: { billId },
        select: { id: true }
      });
      const billExpenseIds = billExpenses.map(e => e.id);
      
      if (billExpenseIds.length > 0) {
        await this.prisma.expenseSplit.deleteMany({ where: { expenseId: { in: billExpenseIds } } });
      }
      await this.prisma.expense.deleteMany({ where: { billId } });
      await this.prisma.billMember.deleteMany({ where: { billId } });
    }

    // Delete bill - no constraints to worry about
    await this.prisma.bill.delete({ where: { id: billId } });
  }

  /**
   * Delete any record from any table without constraint issues
   */
  async deleteFromTable(table: string, id: string): Promise<void> {
    // This is now safe because there are no foreign key constraints
    const deleteQuery = `DELETE FROM ${table} WHERE id = $1`;
    await this.prisma.$executeRawUnsafe(deleteQuery, id);
  }
}

/**
 * Simple test cleanup service - deletes test data without constraint issues
 */
export class TestCleanupService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Clean up test data by identifier pattern
   * Now simple because no foreign key constraints exist
   */
  async cleanupTestData(testIdentifier: string = 'test@'): Promise<void> {
    // Find test users by identifier pattern
    const testUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { fullName: { contains: 'Test' } },
          { fullName: { contains: 'test' } }
        ]
      },
      select: { id: true }
    });

    // Also find by identifiers containing test pattern
    const testUsersByIdentifier = await this.prisma.identifier.findMany({
      where: {
        value: { contains: testIdentifier }
      },
      select: { userId: true }
    });

    const allTestUserIds = [...new Set([
      ...testUsers.map(u => u.id),
      ...testUsersByIdentifier.map(i => i.userId)
    ])];

    if (allTestUserIds.length === 0) {
      return; // No test data to clean
    }

    // Delete test data in any order - no constraints to worry about!
    await this.prisma.identifier.deleteMany({ 
      where: { 
        OR: [
          { userId: { in: allTestUserIds } },
          { value: { contains: testIdentifier } }
        ]
      }
    });

    await this.prisma.session.deleteMany({ where: { userId: { in: allTestUserIds } } });

    // Find test participants and bills
    const testParticipantLinks = await this.prisma.userParticipantLink.findMany({
      where: { userId: { in: allTestUserIds } },
      select: { participantId: true }
    });

    const testBills = await this.prisma.bill.findMany({
      where: { ownerUserId: { in: allTestUserIds } },
      select: { id: true }
    });

    const testParticipantIds = testParticipantLinks.map(p => p.participantId);
    const testBillIds = testBills.map(b => b.id);

    // Delete everything - order doesn't matter anymore!
    if (testBillIds.length > 0) {
      await this.prisma.billChangelog.deleteMany({ where: { billId: { in: testBillIds } } });
      await this.prisma.settlement.deleteMany({ where: { billId: { in: testBillIds } } });
      // First get expense IDs from test bills, then delete splits
      const testExpenses = await this.prisma.expense.findMany({
        where: { billId: { in: testBillIds } },
        select: { id: true }
      });
      const testExpenseIds = testExpenses.map(e => e.id);
      
      if (testExpenseIds.length > 0 || testParticipantIds.length > 0) {
        await this.prisma.expenseSplit.deleteMany({ 
          where: { 
            OR: [
              ...(testExpenseIds.length > 0 ? [{ expenseId: { in: testExpenseIds } }] : []),
              ...(testParticipantIds.length > 0 ? [{ participantId: { in: testParticipantIds } }] : [])
            ]
          }
        });
      }
      await this.prisma.expense.deleteMany({ where: { billId: { in: testBillIds } } });
      await this.prisma.billMember.deleteMany({ where: { billId: { in: testBillIds } } });
      await this.prisma.bill.deleteMany({ where: { id: { in: testBillIds } } });
    }

    if (testParticipantIds.length > 0) {
      await this.prisma.userParticipantLink.deleteMany({ where: { participantId: { in: testParticipantIds } } });
      await this.prisma.participantIdentifier.deleteMany({ where: { participantId: { in: testParticipantIds } } });
      await this.prisma.participant.deleteMany({ where: { id: { in: testParticipantIds } } });
    }

    await this.prisma.user.deleteMany({ where: { id: { in: allTestUserIds } } });
  }

  /**
   * Nuclear option: delete everything from specific tables
   * Use with extreme caution - only for test environments
   */
  async truncateAllTables(): Promise<void> {
    const tables = [
      'bill_changelog',
      'settlements', 
      'expense_splits',
      'expenses',
      'bill_members',
      'bills',
      'users_participants_link',
      'participant_identifiers',
      'participants',
      'sessions',
      'identifiers',
      'users'
    ];

    // Delete in any order - no constraints!
    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
  }
}