import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../app';
import { PrismaClient } from '@prisma/client';
import { DeleteService, TestCleanupService } from '../services/deleteService';

let app: FastifyInstance;
let prisma: PrismaClient;
let deleteService: DeleteService;
let testCleanupService: TestCleanupService;

describe('Independent Table Deletions', () => {
  beforeAll(async () => {
    app = await build({ logger: false });
    await app.ready();
    prisma = app.prisma;
    deleteService = new DeleteService(prisma);
    testCleanupService = new TestCleanupService(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data safely
    await testCleanupService.cleanupTestData('independent-test@');
  });

  describe('User Deletions', () => {
    it('should delete user without constraint issues', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          fullName: 'Independent Test User',
          passwordHash: 'hash',
        }
      });

      await prisma.identifier.create({
        data: {
          userId: user.id,
          type: 'PIX_EMAIL',
          value: 'independent-test@example.com'
        }
      });

      // Delete user directly - no constraints to worry about
      await prisma.user.delete({ where: { id: user.id } });

      // Verify user is gone
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(deletedUser).toBeNull();

      // Identifier still exists (orphaned) - this is now allowed
      const orphanedIdentifier = await prisma.identifier.findFirst({
        where: { userId: user.id }
      });
      expect(orphanedIdentifier).not.toBeNull();
      expect(orphanedIdentifier?.value).toBe('independent-test@example.com');

      // Clean up orphaned data manually
      await prisma.identifier.delete({ where: { id: orphanedIdentifier!.id } });
    });

    it('should delete user with cleanup option', async () => {
      // Create user with related data
      const user = await prisma.user.create({
        data: {
          fullName: 'Cleanup Test User',
          passwordHash: 'hash',
        }
      });

      await prisma.identifier.create({
        data: {
          userId: user.id,
          type: 'PIX_EMAIL',
          value: 'cleanup-independent-test@example.com'
        }
      });

      const bill = await prisma.bill.create({
        data: {
          name: 'Test Bill',
          ownerUserId: user.id
        }
      });

      // Delete user with cleanup
      await deleteService.deleteUser(user.id, true);

      // Verify everything is gone
      const [deletedUser, deletedIdentifier, deletedBill] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id } }),
        prisma.identifier.findFirst({ where: { userId: user.id } }),
        prisma.bill.findUnique({ where: { id: bill.id } })
      ]);

      expect(deletedUser).toBeNull();
      expect(deletedIdentifier).toBeNull();
      expect(deletedBill).toBeNull();
    });
  });

  describe('Participant Deletions', () => {
    it('should delete participant without constraint issues', async () => {
      // Create participant with bill membership
      const participant = await prisma.participant.create({
        data: {
          displayName: 'Test Participant'
        }
      });

      const user = await prisma.user.create({
        data: {
          fullName: 'Participant Owner',
          passwordHash: 'hash',
        }
      });

      const bill = await prisma.bill.create({
        data: {
          name: 'Test Bill',
          ownerUserId: user.id
        }
      });

      await prisma.billMember.create({
        data: {
          billId: bill.id,
          participantId: participant.id,
          role: 'MEMBER'
        }
      });

      // Delete participant directly - no constraints
      await prisma.participant.delete({ where: { id: participant.id } });

      // Verify participant is gone
      const deletedParticipant = await prisma.participant.findUnique({
        where: { id: participant.id }
      });
      expect(deletedParticipant).toBeNull();

      // Bill member record still exists (orphaned)
      const orphanedMember = await prisma.billMember.findFirst({
        where: { participantId: participant.id }
      });
      expect(orphanedMember).not.toBeNull();

      // Clean up
      await prisma.billMember.delete({ where: { id: orphanedMember!.id } });
      await prisma.bill.delete({ where: { id: bill.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('Bill Deletions', () => {
    it('should delete bill without constraint issues', async () => {
      // Create bill with members and expenses
      const user = await prisma.user.create({
        data: {
          fullName: 'Bill Owner',
          passwordHash: 'hash',
        }
      });

      const participant = await prisma.participant.create({
        data: {
          displayName: 'Bill Participant'
        }
      });

      const bill = await prisma.bill.create({
        data: {
          name: 'Test Bill',
          ownerUserId: user.id
        }
      });

      await prisma.billMember.create({
        data: {
          billId: bill.id,
          participantId: participant.id,
          role: 'MEMBER'
        }
      });

      const expense = await prisma.expense.create({
        data: {
          billId: bill.id,
          payerParticipantId: participant.id,
          amountCents: 1000,
          description: 'Test expense',
          spentAt: new Date()
        }
      });

      // Delete bill directly - no constraints
      await prisma.bill.delete({ where: { id: bill.id } });

      // Verify bill is gone
      const deletedBill = await prisma.bill.findUnique({
        where: { id: bill.id }
      });
      expect(deletedBill).toBeNull();

      // Related records still exist (orphaned)
      const [orphanedMember, orphanedExpense] = await Promise.all([
        prisma.billMember.findFirst({ where: { billId: bill.id } }),
        prisma.expense.findFirst({ where: { billId: bill.id } })
      ]);

      expect(orphanedMember).not.toBeNull();
      expect(orphanedExpense).not.toBeNull();

      // Clean up orphaned data
      await prisma.billMember.delete({ where: { id: orphanedMember!.id } });
      await prisma.expense.delete({ where: { id: orphanedExpense!.id } });
      await prisma.participant.delete({ where: { id: participant.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('Mixed Order Deletions', () => {
    it('should delete in any order without issues', async () => {
      // Create complex related data
      const user = await prisma.user.create({
        data: {
          fullName: 'Mixed Order Test User',
          passwordHash: 'hash',
        }
      });

      await prisma.identifier.create({
        data: {
          userId: user.id,
          type: 'PIX_EMAIL',
          value: 'mixed-independent-test@example.com'
        }
      });

      const participant = await prisma.participant.create({
        data: {
          displayName: 'Mixed Order Participant'
        }
      });

      const bill = await prisma.bill.create({
        data: {
          name: 'Mixed Order Bill',
          ownerUserId: user.id
        }
      });

      await prisma.billMember.create({
        data: {
          billId: bill.id,
          participantId: participant.id,
          role: 'MEMBER'
        }
      });

      const expense = await prisma.expense.create({
        data: {
          billId: bill.id,
          payerParticipantId: participant.id,
          amountCents: 2000,
          description: 'Mixed order expense',
          spentAt: new Date()
        }
      });

      await prisma.expenseSplit.create({
        data: {
          expenseId: expense.id,
          participantId: participant.id,
          shareType: 'EQUAL',
          shareValue: 1,
          amountCents: 2000
        }
      });

      // Delete in random order - should work fine
      await prisma.user.delete({ where: { id: user.id } }); // Delete first
      await prisma.expense.delete({ where: { id: expense.id } }); // Delete second
      await prisma.participant.delete({ where: { id: participant.id } }); // Delete third
      await prisma.bill.delete({ where: { id: bill.id } }); // Delete fourth

      // Verify all main entities are gone
      const [deletedUser, deletedParticipant, deletedBill, deletedExpense] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id } }),
        prisma.participant.findUnique({ where: { id: participant.id } }),
        prisma.bill.findUnique({ where: { id: bill.id } }),
        prisma.expense.findUnique({ where: { id: expense.id } })
      ]);

      expect(deletedUser).toBeNull();
      expect(deletedParticipant).toBeNull();
      expect(deletedBill).toBeNull();
      expect(deletedExpense).toBeNull();

      // Clean up remaining orphaned data
      await prisma.identifier.deleteMany({ where: { userId: user.id } });
      await prisma.billMember.deleteMany({ where: { billId: bill.id } });
      await prisma.expenseSplit.deleteMany({ where: { expenseId: expense.id } });
    });
  });

  describe('Test Cleanup Service', () => {
    it('should clean up test data effectively', async () => {
      // Create test and non-test data
      const testUser = await prisma.user.create({
        data: {
          fullName: 'Test User For Cleanup',
          passwordHash: 'hash',
        }
      });

      const prodUser = await prisma.user.create({
        data: {
          fullName: 'Production User',
          passwordHash: 'hash',
        }
      });

      const timestamp = Date.now();
      
      await prisma.identifier.create({
        data: { userId: testUser.id, type: 'PIX_EMAIL', value: `cleanup-independent-test-${timestamp}@example.com` }
      });

      await prisma.identifier.create({
        data: { userId: prodUser.id, type: 'PIX_EMAIL', value: `prod-${timestamp}@company.com` }
      });

      // Create participants and bills
      const testParticipant = await prisma.participant.create({
        data: { displayName: 'Test Participant For Cleanup' }
      });

      const testBill = await prisma.bill.create({
        data: {
          name: 'Test Bill For Cleanup',
          ownerUserId: testUser.id
        }
      });

      // Link participant to test user so cleanup can find it
      await prisma.userParticipantLink.create({
        data: {
          userId: testUser.id,
          participantId: testParticipant.id
        }
      });

      // Run cleanup
      await testCleanupService.cleanupTestData(`cleanup-independent-test-${timestamp}@`);

      // Verify test data is gone
      const [testUserExists, testParticipantExists, testBillExists] = await Promise.all([
        prisma.user.findUnique({ where: { id: testUser.id } }),
        prisma.participant.findUnique({ where: { id: testParticipant.id } }),
        prisma.bill.findUnique({ where: { id: testBill.id } })
      ]);

      expect(testUserExists).toBeNull();
      expect(testParticipantExists).toBeNull();
      expect(testBillExists).toBeNull();

      // Verify production data remains
      const prodUserExists = await prisma.user.findUnique({ where: { id: prodUser.id } });
      expect(prodUserExists).not.toBeNull();

      // Clean up production data
      await prisma.identifier.deleteMany({ where: { userId: prodUser.id } });
      await prisma.user.delete({ where: { id: prodUser.id } });
    });
  });
});