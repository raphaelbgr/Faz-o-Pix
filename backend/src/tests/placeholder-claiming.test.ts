import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../app';
import { PrismaClient } from '@prisma/client';
import { TestCleanupService } from '../services/deleteService';
import { cpf } from 'cpf-cnpj-validator';

let app: FastifyInstance;
let prisma: PrismaClient;
let testCleanupService: TestCleanupService;

// Helper function to generate unique test identifiers
function generateUniqueTestIdentifiers() {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  return {
    cpf: cpf.generate(),
    email: `placeholder-test-${timestamp}-${randomSuffix}@example.com`,
    phone: `+5511${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    evp: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`
  };
}

describe('Placeholder Claiming', () => {
  beforeAll(async () => {
    app = await build({ logger: false });
    await app.ready();
    prisma = app.prisma;
    testCleanupService = new TestCleanupService(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data safely - handle all email patterns used in tests
    await testCleanupService.cleanupTestData('placeholder-test');
    await testCleanupService.cleanupTestData('claiming-test');
    await testCleanupService.cleanupTestData('user-');
    await testCleanupService.cleanupTestData('log-');
    await testCleanupService.cleanupTestData('@example.com');
    
    // Additional cleanup for standalone placeholder participants
    // Delete any participant identifiers with test patterns
    await prisma.participantIdentifier.deleteMany({
      where: {
        OR: [
          { value: { contains: '@example.com' } },
          { value: { contains: 'placeholder-test' } },
          { value: { contains: 'user-' } },
          { value: { contains: 'log-' } }
        ]
      }
    });
    
    // Clean up standalone participants (those without user links)
    const participantsWithUsers = await prisma.userParticipantLink.findMany({
      select: { participantId: true }
    });
    const linkedParticipantIds = participantsWithUsers.map(p => p.participantId);
    
    await prisma.participant.deleteMany({
      where: {
        AND: [
          { id: { notIn: linkedParticipantIds } },
          { displayName: { contains: 'Placeholder' } }
        ]
      }
    });
  });

  describe('Registration with Placeholder Claiming', () => {
    it('should claim a single placeholder participant on registration', async () => {
      // Generate unique test CPF for this test
      const testCPF = cpf.generate();
      
      // Create a placeholder participant with a bill
      const owner = await prisma.user.create({
        data: {
          fullName: 'Bill Owner',
          passwordHash: 'hash',
        },
      });

      const bill = await prisma.bill.create({
        data: {
          name: 'Test Bill',
          ownerUserId: owner.id,
        },
      });

      const placeholder = await prisma.participant.create({
        data: {
          displayName: 'Placeholder User',
        },
      });

      await prisma.participantIdentifier.create({
        data: {
          participantId: placeholder.id,
          type: 'PIX_CPF',
          value: testCPF,
        },
      });

      await prisma.billMember.create({
        data: {
          billId: bill.id,
          participantId: placeholder.id,
          role: 'MEMBER',
        },
      });

      // Register new user with matching identifier
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'New User',
          password: 'SecurePass123!',
          identifiers: [
            { type: 'PIX_CPF', value: testCPF },
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      
      expect(data.claimedPlaceholders).toBeDefined();
      expect(data.claimedPlaceholders.count).toBe(1);
      expect(data.claimedPlaceholders.totalBills).toBe(1);
      expect(data.claimedPlaceholders.bills).toHaveLength(1);
      expect(data.claimedPlaceholders.bills[0].billName).toBe('Test Bill');
      expect(data.claimedPlaceholders.bills[0].billOwnerName).toBe('Bill Owner');

      // Verify participant is now linked to user
      const link = await prisma.userParticipantLink.findFirst({
        where: { participantId: placeholder.id },
      });
      expect(link).toBeDefined();
      expect(link?.userId).toBe(data.userId);
    });

    it('should claim multiple placeholder participants across different bills', async () => {
      // Create two bills with placeholder participants
      const owner1 = await prisma.user.create({
        data: {
          fullName: 'Owner One',
          passwordHash: 'hash',
        },
      });

      const owner2 = await prisma.user.create({
        data: {
          fullName: 'Owner Two',
          passwordHash: 'hash',
        },
      });

      const bill1 = await prisma.bill.create({
        data: {
          name: 'Bill One',
          ownerUserId: owner1.id,
        },
      });

      const bill2 = await prisma.bill.create({
        data: {
          name: 'Bill Two',
          ownerUserId: owner2.id,
        },
      });

      // Create two placeholder participants with different identifiers
      const placeholder1 = await prisma.participant.create({
        data: {
          displayName: 'Placeholder CPF',
        },
      });

      const placeholder2 = await prisma.participant.create({
        data: {
          displayName: 'Placeholder Email',
        },
      });

      // Generate unique identifiers for this test
      const testIdentifiers = generateUniqueTestIdentifiers();
      const testCPF = testIdentifiers.cpf;
      const testEmail = testIdentifiers.email;
      
      await prisma.participantIdentifier.createMany({
        data: [
          {
            participantId: placeholder1.id,
            type: 'PIX_CPF',
            value: testCPF,
          },
          {
            participantId: placeholder2.id,
            type: 'PIX_EMAIL',
            value: testEmail,
          },
        ],
      });

      await prisma.billMember.createMany({
        data: [
          {
            billId: bill1.id,
            participantId: placeholder1.id,
            role: 'MEMBER',
          },
          {
            billId: bill2.id,
            participantId: placeholder2.id,
            role: 'MEMBER',
          },
        ],
      });

      // Register with both identifiers
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Multi Identifier User',
          password: 'SecurePass123!',
          identifiers: [
            { type: 'PIX_CPF', value: testCPF },
            { type: 'PIX_EMAIL', value: testEmail },
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      
      expect(data.claimedPlaceholders).toBeDefined();
      expect(data.claimedPlaceholders.count).toBe(2);
      expect(data.claimedPlaceholders.totalBills).toBe(2);
      expect(data.claimedPlaceholders.bills).toHaveLength(2);

      // Verify user is linked to one participant that has memberships in both bills
      const links = await prisma.userParticipantLink.findMany({
        where: { userId: data.userId },
      });
      expect(links).toHaveLength(1); // One participant that merged all placeholders
      
      // Verify the participant has memberships in both bills
      const billMemberships = await prisma.billMember.findMany({
        where: { participantId: links[0].participantId },
      });
      expect(billMemberships).toHaveLength(2); // Member of both bills
    });

    it('should preserve financial history when claiming placeholder', async () => {
      // Generate unique test CPF for this test
      const testCPF = cpf.generate();
      
      // Create bill with placeholder participant and expenses
      const owner = await prisma.user.create({
        data: {
          fullName: 'Bill Owner',
          passwordHash: 'hash',
        },
      });

      const ownerParticipant = await prisma.participant.create({
        data: {
          displayName: 'Bill Owner',
        },
      });

      await prisma.userParticipantLink.create({
        data: {
          userId: owner.id,
          participantId: ownerParticipant.id,
        },
      });

      const bill = await prisma.bill.create({
        data: {
          name: 'Bill with Expenses',
          ownerUserId: owner.id,
        },
      });

      const placeholder = await prisma.participant.create({
        data: {
          displayName: 'Placeholder with Expenses',
        },
      });

      await prisma.participantIdentifier.create({
        data: {
          participantId: placeholder.id,
          type: 'PIX_CPF',
          value: testCPF,
        },
      });

      await prisma.billMember.createMany({
        data: [
          {
            billId: bill.id,
            participantId: ownerParticipant.id,
            role: 'OWNER',
          },
          {
            billId: bill.id,
            participantId: placeholder.id,
            role: 'MEMBER',
          },
        ],
      });

      // Create expense paid by placeholder
      const expense1 = await prisma.expense.create({
        data: {
          billId: bill.id,
          payerParticipantId: placeholder.id,
          amountCents: 10000, // R$ 100
          description: 'Dinner',
          spentAt: new Date(),
        },
      });

      await prisma.expenseSplit.createMany({
        data: [
          {
            expenseId: expense1.id,
            participantId: placeholder.id,
            shareType: 'EQUAL',
            shareValue: 0.5,
            amountCents: 5000,
          },
          {
            expenseId: expense1.id,
            participantId: ownerParticipant.id,
            shareType: 'EQUAL',
            shareValue: 0.5,
            amountCents: 5000,
          },
        ],
      });

      // Create expense paid by owner, split with placeholder
      const expense2 = await prisma.expense.create({
        data: {
          billId: bill.id,
          payerParticipantId: ownerParticipant.id,
          amountCents: 6000, // R$ 60
          description: 'Lunch',
          spentAt: new Date(),
        },
      });

      await prisma.expenseSplit.createMany({
        data: [
          {
            expenseId: expense2.id,
            participantId: placeholder.id,
            shareType: 'EQUAL',
            shareValue: 0.5,
            amountCents: 3000,
          },
          {
            expenseId: expense2.id,
            participantId: ownerParticipant.id,
            shareType: 'EQUAL',
            shareValue: 0.5,
            amountCents: 3000,
          },
        ],
      });

      // Create settlement
      await prisma.settlement.create({
        data: {
          billId: bill.id,
          fromParticipantId: ownerParticipant.id,
          toParticipantId: placeholder.id,
          amountCents: 2000, // R$ 20
          method: 'PIX',
        },
      });

      // Register and claim
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Claimed User',
          password: 'SecurePass123!',
          identifiers: [
            { type: 'PIX_CPF', value: testCPF },
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      
      expect(data.claimedPlaceholders).toBeDefined();
      expect(data.claimedPlaceholders.bills[0].expenseCount).toBe(2);
      expect(data.claimedPlaceholders.bills[0].settlementCount).toBe(1);
      
      // Verify financial summary
      const summary = data.claimedPlaceholders.financialSummary;
      expect(summary.totalPaid).toBe(10000); // Paid R$ 100
      expect(summary.totalOwed).toBe(8000); // Owed R$ 50 + R$ 30
      expect(summary.netBalance).toBe(4000); // R$ 100 - R$ 80 + R$ 20 = R$ 40
    });

    it('should not claim already claimed participants', async () => {
      // Generate unique test CPF for this test
      const testCPF = cpf.generate();
      
      // Create and claim a placeholder
      const firstUser = await prisma.user.create({
        data: {
          fullName: 'First User',
          passwordHash: 'hash',
        },
      });

      const placeholder = await prisma.participant.create({
        data: {
          displayName: 'Already Claimed',
        },
      });

      await prisma.participantIdentifier.create({
        data: {
          participantId: placeholder.id,
          type: 'PIX_CPF',
          value: testCPF,
        },
      });

      await prisma.userParticipantLink.create({
        data: {
          userId: firstUser.id,
          participantId: placeholder.id,
        },
      });

      // Try to register another user with same identifier
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Second User',
          password: 'SecurePass123!',
          identifiers: [
            { type: 'PIX_CPF', value: testCPF },
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        },
      });

      // Should fail because identifier is already registered
      expect(response.statusCode).toBe(409);
    });

    it('should handle registration without any placeholders to claim', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'New User No Claims',
          password: 'SecurePass123!',
          identifiers: [
            { type: 'PIX_CPF', value: cpf.generate() },
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      
      expect(data.claimedPlaceholders).toBeUndefined();
      expect(data.userId).toBeDefined();
      expect(data.message).toBe('User created successfully');
    });

    it('should log claiming events in changelog', async () => {
      // Generate unique test identifiers for this test
      const testIdentifiers = generateUniqueTestIdentifiers();
      const testEmail = testIdentifiers.email;
      
      // Create placeholder with bill
      const owner = await prisma.user.create({
        data: {
          fullName: 'Owner',
          passwordHash: 'hash',
        },
      });

      const bill = await prisma.bill.create({
        data: {
          name: 'Bill with Changelog',
          ownerUserId: owner.id,
        },
      });

      const placeholder = await prisma.participant.create({
        data: {
          displayName: 'Placeholder for Changelog',
        },
      });

      await prisma.participantIdentifier.create({
        data: {
          participantId: placeholder.id,
          type: 'PIX_EMAIL',
          value: testEmail,
        },
      });

      await prisma.billMember.create({
        data: {
          billId: bill.id,
          participantId: placeholder.id,
          role: 'MEMBER',
        },
      });

      // Register and claim
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Logged User',
          password: 'SecurePass123!',
          identifiers: [
            { type: 'PIX_EMAIL', value: testEmail },
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        },
      });

      expect(response.statusCode).toBe(201);

      // Check changelog
      const changelog = await prisma.billChangelog.findMany({
        where: {
          billId: bill.id,
          action: 'PLACEHOLDER_CLAIMED',
        },
      });

      expect(changelog).toHaveLength(1);
      expect(changelog[0].entityType).toBe('MEMBER');
      expect(changelog[0].entityId).toBe(placeholder.id);
      expect(changelog[0].description).toContain('claimed during registration');
    });

    it('should calculate correct balances across multiple bills', async () => {
      // Generate unique test phone for this test
      const testPhone = `+5511${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      
      // Create two bills with different balances
      const owner = await prisma.user.create({
        data: {
          fullName: 'Multi Bill Owner',
          passwordHash: 'hash',
        },
      });

      const ownerParticipant = await prisma.participant.create({
        data: {
          displayName: 'Multi Bill Owner',
        },
      });

      await prisma.userParticipantLink.create({
        data: {
          userId: owner.id,
          participantId: ownerParticipant.id,
        },
      });

      const [bill1, bill2] = await Promise.all([
        prisma.bill.create({
          data: {
            name: 'Bill One Balance',
            ownerUserId: owner.id,
          },
        }),
        prisma.bill.create({
          data: {
            name: 'Bill Two Balance',
            ownerUserId: owner.id,
          },
        }),
      ]);

      const placeholder = await prisma.participant.create({
        data: {
          displayName: 'Multi Bill Placeholder',
        },
      });

      await prisma.participantIdentifier.create({
        data: {
          participantId: placeholder.id,
          type: 'PIX_PHONE',
          value: testPhone,
        },
      });

      await prisma.billMember.createMany({
        data: [
          {
            billId: bill1.id,
            participantId: placeholder.id,
            role: 'MEMBER',
          },
          {
            billId: bill1.id,
            participantId: ownerParticipant.id,
            role: 'OWNER',
          },
          {
            billId: bill2.id,
            participantId: placeholder.id,
            role: 'MEMBER',
          },
          {
            billId: bill2.id,
            participantId: ownerParticipant.id,
            role: 'OWNER',
          },
        ],
      });

      // Bill 1: Placeholder owes R$ 30
      const expense1 = await prisma.expense.create({
        data: {
          billId: bill1.id,
          payerParticipantId: ownerParticipant.id,
          amountCents: 6000,
          description: 'Bill 1 Expense',
          spentAt: new Date(),
        },
      });

      await prisma.expenseSplit.createMany({
        data: [
          {
            expenseId: expense1.id,
            participantId: placeholder.id,
            shareType: 'EQUAL',
            shareValue: 0.5,
            amountCents: 3000,
          },
          {
            expenseId: expense1.id,
            participantId: ownerParticipant.id,
            shareType: 'EQUAL',
            shareValue: 0.5,
            amountCents: 3000,
          },
        ],
      });

      // Bill 2: Placeholder is owed R$ 50
      const expense2 = await prisma.expense.create({
        data: {
          billId: bill2.id,
          payerParticipantId: placeholder.id,
          amountCents: 10000,
          description: 'Bill 2 Expense',
          spentAt: new Date(),
        },
      });

      await prisma.expenseSplit.createMany({
        data: [
          {
            expenseId: expense2.id,
            participantId: placeholder.id,
            shareType: 'EQUAL',
            shareValue: 0.5,
            amountCents: 5000,
          },
          {
            expenseId: expense2.id,
            participantId: ownerParticipant.id,
            shareType: 'EQUAL',
            shareValue: 0.5,
            amountCents: 5000,
          },
        ],
      });

      // Register and claim
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Multi Balance User',
          password: 'SecurePass123!',
          identifiers: [
            { type: 'PIX_PHONE', value: testPhone },
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      
      expect(data.claimedPlaceholders).toBeDefined();
      expect(data.claimedPlaceholders.totalBills).toBe(2);
      
      // Check individual bill balances
      const bill1Data = data.claimedPlaceholders.bills.find((b: any) => b.billName === 'Bill One Balance');
      const bill2Data = data.claimedPlaceholders.bills.find((b: any) => b.billName === 'Bill Two Balance');
      
      expect(bill1Data.currentBalance).toBe(-3000); // Owes R$ 30
      expect(bill2Data.currentBalance).toBe(5000); // Is owed R$ 50
      
      // Check overall summary
      const summary = data.claimedPlaceholders.financialSummary;
      expect(summary.netBalance).toBe(2000); // -R$ 30 + R$ 50 = R$ 20
      expect(summary.activeDebts).toBe(1); // One bill with debt
      expect(summary.settledBills).toBe(0); // No settled bills
    });
  });
});