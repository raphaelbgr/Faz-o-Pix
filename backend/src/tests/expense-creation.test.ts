import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../app';
import { PrismaClient, ShareType } from '@prisma/client';
import { 
  calculateEqualSplit, 
  calculatePercentageSplit, 
  calculateSharesSplit 
} from '../services/expenseService';
import { TestCleanupService } from '../services/deleteService';

let app: FastifyInstance;
let prisma: PrismaClient;
let testCleanupService: TestCleanupService;

describe('Story 3.1: Expense Addition with Flexible Splits', () => {
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
    // Clean up test data safely
    await testCleanupService.cleanupTestData('expense-test@');
  });

  describe('Split Calculation Algorithms', () => {
    describe('Equal Split', () => {
      it('should split amount equally among participants', () => {
        const participantIds = ['p1', 'p2', 'p3'];
        const result = calculateEqualSplit(3000, participantIds); // R$ 30.00

        expect(result).toHaveLength(3);
        expect(result[0].amountCents).toBe(1000);
        expect(result[1].amountCents).toBe(1000);
        expect(result[2].amountCents).toBe(1000);
        
        // Verify total
        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(3000);
      });

      it('should handle remainder cents using largest remainder method', () => {
        const participantIds = ['p1', 'p2', 'p3'];
        const result = calculateEqualSplit(1001, participantIds); // R$ 10.01

        expect(result).toHaveLength(3);
        expect(result[0].amountCents).toBe(334); // Gets remainder cent
        expect(result[1].amountCents).toBe(334); // Gets remainder cent  
        expect(result[2].amountCents).toBe(333);

        // Verify total
        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(1001);
      });

      it('should handle single participant', () => {
        const result = calculateEqualSplit(2500, ['p1']); // R$ 25.00

        expect(result).toHaveLength(1);
        expect(result[0].amountCents).toBe(2500);
        expect(result[0].participantId).toBe('p1');
        expect(result[0].shareType).toBe(ShareType.EQUAL);
      });

      it('should handle large remainder distribution', () => {
        const participantIds = ['p1', 'p2', 'p3', 'p4', 'p5'];
        const result = calculateEqualSplit(1007, participantIds); // R$ 10.07 with 7 remainder cents

        // Base amount: 201 cents per person, remainder: 2 cents
        expect(result[0].amountCents).toBe(202); // Gets remainder cent
        expect(result[1].amountCents).toBe(202); // Gets remainder cent
        expect(result[2].amountCents).toBe(201);
        expect(result[3].amountCents).toBe(201);
        expect(result[4].amountCents).toBe(201);

        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(1007);
      });

      it('should throw error for empty participants', () => {
        expect(() => calculateEqualSplit(1000, [])).toThrow('At least one participant is required');
      });

      it('should throw error for zero amount', () => {
        expect(() => calculateEqualSplit(0, ['p1'])).toThrow('Total amount must be positive');
      });
    });

    describe('Percentage Split', () => {
      it('should split amount by percentages', () => {
        const splits = [
          { participantId: 'p1', percentage: 50.0 },
          { participantId: 'p2', percentage: 30.0 },
          { participantId: 'p3', percentage: 20.0 }
        ];
        const result = calculatePercentageSplit(10000, splits); // R$ 100.00

        expect(result).toHaveLength(3);
        expect(result[0].amountCents).toBe(5000); // 50%
        expect(result[1].amountCents).toBe(3000); // 30%
        expect(result[2].amountCents).toBe(2000); // 20% (gets remainder)

        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(10000);
      });

      it('should handle decimal percentages with rounding', () => {
        const splits = [
          { participantId: 'p1', percentage: 33.33 },
          { participantId: 'p2', percentage: 33.33 },
          { participantId: 'p3', percentage: 33.34 }
        ];
        const result = calculatePercentageSplit(10000, splits); // R$ 100.00

        expect(result[0].amountCents).toBe(3333); // 33.33%
        expect(result[1].amountCents).toBe(3333); // 33.33%
        expect(result[2].amountCents).toBe(3334); // 33.34% (gets remainder)

        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(10000);
      });

      it('should handle rounding errors by adjusting last participant', () => {
        const splits = [
          { participantId: 'p1', percentage: 33.33 },
          { participantId: 'p2', percentage: 66.67 }
        ];
        const result = calculatePercentageSplit(1000, splits); // R$ 10.00

        // Calculated amounts might not sum exactly due to rounding
        // Last participant gets adjusted amount
        expect(result[0].amountCents).toBe(333); // 33.33% = 333.3 -> 333
        expect(result[1].amountCents).toBe(667); // Remainder to ensure total = 1000

        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(1000);
      });

      it('should throw error if percentages do not sum to 100%', () => {
        const splits = [
          { participantId: 'p1', percentage: 40.0 },
          { participantId: 'p2', percentage: 30.0 }
        ];

        expect(() => calculatePercentageSplit(1000, splits))
          .toThrow('Percentages must sum to 100%');
      });

      it('should allow small tolerance in percentage sum (floating point precision)', () => {
        const splits = [
          { participantId: 'p1', percentage: 33.33 },
          { participantId: 'p2', percentage: 33.33 },
          { participantId: 'p3', percentage: 33.34 }
        ];
        
        // This should work despite floating point precision issues
        expect(() => calculatePercentageSplit(1000, splits)).not.toThrow();
      });

      it('should throw error for invalid percentage values', () => {
        const splits = [
          { participantId: 'p1', percentage: 0 },
          { participantId: 'p2', percentage: 100 }
        ];

        expect(() => calculatePercentageSplit(1000, splits))
          .toThrow('All percentages must be between 0% and 100%');
      });

      it('should throw error for empty splits', () => {
        expect(() => calculatePercentageSplit(1000, []))
          .toThrow('At least one participant is required');
      });
    });

    describe('Shares Split', () => {
      it('should split amount by proportional shares', () => {
        const splits = [
          { participantId: 'p1', shares: 2 },
          { participantId: 'p2', shares: 3 },
          { participantId: 'p3', shares: 1 }
        ];
        const result = calculateSharesSplit(6000, splits); // R$ 60.00, total 6 shares

        expect(result).toHaveLength(3);
        expect(result[0].amountCents).toBe(2000); // 2/6 = 33.33%
        expect(result[1].amountCents).toBe(3000); // 3/6 = 50%
        expect(result[2].amountCents).toBe(1000); // 1/6 = 16.67% (gets remainder)

        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(6000);
      });

      it('should handle complex share ratios with rounding', () => {
        const splits = [
          { participantId: 'p1', shares: 7 },
          { participantId: 'p2', shares: 5 },
          { participantId: 'p3', shares: 3 }
        ];
        const result = calculateSharesSplit(1000, splits); // R$ 10.00, total 15 shares

        // p1: 7/15 * 1000 = 466.67 -> 467
        // p2: 5/15 * 1000 = 333.33 -> 333
        // p3: gets remainder to ensure total = 1000
        expect(result[0].amountCents).toBe(467);
        expect(result[1].amountCents).toBe(333);
        expect(result[2].amountCents).toBe(200);

        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(1000);
      });

      it('should handle single share', () => {
        const splits = [
          { participantId: 'p1', shares: 1 }
        ];
        const result = calculateSharesSplit(2500, splits);

        expect(result).toHaveLength(1);
        expect(result[0].amountCents).toBe(2500);
        expect(result[0].participantId).toBe('p1');
        expect(result[0].shareType).toBe(ShareType.SHARES);
      });

      it('should throw error for invalid share values', () => {
        const splits = [
          { participantId: 'p1', shares: 0 }, // Invalid
          { participantId: 'p2', shares: 5 }
        ];

        expect(() => calculateSharesSplit(1000, splits))
          .toThrow('All shares must be positive integers');
      });

      it('should throw error for non-integer shares', () => {
        const splits = [
          { participantId: 'p1', shares: 2.5 }, // Invalid
          { participantId: 'p2', shares: 3 }
        ];

        expect(() => calculateSharesSplit(1000, splits))
          .toThrow('All shares must be positive integers');
      });

      it('should throw error for empty splits', () => {
        expect(() => calculateSharesSplit(1000, []))
          .toThrow('At least one participant is required');
      });
    });
  });

  describe('API Expense Creation', () => {
    let testUser: any;
    let testBill: any;
    let participants: any[];
    let authCookie: string;

    beforeEach(async () => {
      // Check if test user already exists
      // Create highly unique email for this test run to prevent concurrent test conflicts
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 15);
      const testEmail = `test-expense-creation-${timestamp}-${randomSuffix}@example.com`;
      const existingIdentifier = await prisma.identifier.findUnique({
        where: { value: testEmail }
      });
      
      let existingUser = null;
      let hasParticipantLink = false;
      
      if (existingIdentifier) {
        existingUser = await prisma.user.findUnique({
          where: { id: existingIdentifier.userId }
        });
        
        if (existingUser) {
          const participantLink = await prisma.userParticipantLink.findUnique({
            where: { userId: existingUser.id }
          });
          hasParticipantLink = !!participantLink;
        }
      }

      if (!existingUser || !hasParticipantLink) {
        // Create test user only if it doesn't exist
        const signupResponse = await app.inject({
          method: 'POST',
          url: '/api/auth/signup',
          payload: {
            fullName: 'Test User',
            password: 'TestPass123!',
            identifiers: [
              { type: 'EMAIL', value: testEmail }
            ],
            lgpdConsent: {
              accepted: true,
              timestamp: new Date().toISOString(),
              ipAddress: '127.0.0.1'
            }
          }
        });

        if (signupResponse.statusCode !== 201 && signupResponse.statusCode !== 409) {
          throw new Error(`Unexpected signup response: ${signupResponse.statusCode} ${signupResponse.payload}`);
        }
      }

      // Login with test user
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: testEmail,
          password: 'TestPass123!'
        }
      });

      expect(loginResponse.statusCode).toBe(200);
      testUser = JSON.parse(loginResponse.body);
      const sessionCookie = loginResponse.headers['set-cookie'];
      authCookie = Array.isArray(sessionCookie) ? sessionCookie[0] : sessionCookie || '';

      // Ensure participant link exists (needed for expense creation)
      let userParticipant = await prisma.userParticipantLink.findUnique({
        where: { userId: testUser.userId }
      });

      if (!userParticipant) {
        // If user exists but no participant link, create the participant relationship
        console.log('User exists but no participant link found. Creating participant for existing user.');
        
        const user = await prisma.user.findUnique({
          where: { id: testUser.userId },
        });
        
        const userIdentifiers = user ? await prisma.identifier.findMany({
          where: { userId: user.id }
        }) : [];
        
        if (user) {
          await prisma.$transaction(async (tx) => {
            // Create participant
            const participant = await tx.participant.create({
              data: {
                displayName: user.fullName,
              },
            });

            // Create participant identifiers
            if (userIdentifiers.length > 0) {
              await tx.participantIdentifier.createMany({
                data: userIdentifiers.map(id => ({
                  participantId: participant.id,
                  type: id.type,
                  value: id.value,
                })),
              });
            }

            // Link user to participant
            await tx.userParticipantLink.create({
              data: {
                userId: user.id,
                participantId: participant.id,
              },
            });
          });
        }
      }

      // Create test bill
      const billResponse = await app.inject({
        method: 'POST',
        url: '/api/bills',
        payload: {
          name: 'Test Bill for Expenses',
          description: 'Testing expense creation'
        },
        cookies: { fazopix_session: authCookie }
      });

      expect(billResponse.statusCode).toBe(201);
      testBill = JSON.parse(billResponse.body);

      // Add additional participants for testing
      const memberResponse1 = await app.inject({
        method: 'POST',
        url: `/api/bills/${testBill.data.id}/members`,
        payload: {
          identifierType: 'PIX_CPF',
          identifierValue: '16715851000',
          displayName: 'Participant 1'
        },
        cookies: { fazopix_session: authCookie }
      });

      const memberResponse2 = await app.inject({
        method: 'POST',
        url: `/api/bills/${testBill.data.id}/members`,
        payload: {
          identifierType: 'PIX_CPF',
          identifierValue: '26020085406',
          displayName: 'Participant 2'
        },
        cookies: { fazopix_session: authCookie }
      });

      expect(memberResponse1.statusCode).toBe(201);
      expect(memberResponse2.statusCode).toBe(201);

      // Get all participants for testing
      const membersResponse = await app.inject({
        method: 'GET',
        url: `/api/bills/${testBill.data.id}/members`,
        cookies: { fazopix_session: authCookie }
      });

      participants = JSON.parse(membersResponse.body).data.members;
    });

    describe('Equal Split Expenses', () => {
      it('should create expense with equal split', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        const allParticipantIds = participants.map(p => p.participant_id);

        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 3000, // R$ 30.00
            description: 'Restaurant dinner',
            spentAt: new Date().toISOString(),
            splitType: 'equal',
            splits: allParticipantIds.map(id => ({ participantId: id }))
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);

        expect(data.success).toBe(true);
        expect(data.data.totalAmount).toBe(3000);
        expect(data.data.splits).toHaveLength(3);
        
        // Each participant should owe R$ 10.00 (1000 cents)
        data.data.splits.forEach((split: any) => {
          expect(split.amountCents).toBe(1000);
        });

        // Verify balance impact
        expect(data.data.balanceImpact).toHaveLength(3);
        const payerBalance = data.data.balanceImpact.find(
          (b: any) => b.participantId === payerParticipant.participant_id
        );
        expect(payerBalance.balanceChange).toBe(2000); // Paid 3000, owes 1000 = +2000 balance
      });

      it('should handle remainder cents in equal split', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        const allParticipantIds = participants.map(p => p.participant_id);

        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 1001, // R$ 10.01
            description: 'Coffee with remainder',
            spentAt: new Date().toISOString(),
            splitType: 'equal',
            splits: allParticipantIds.map(id => ({ participantId: id }))
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);

        // Total should match exactly
        const totalSplit = data.data.splits.reduce((sum: number, split: any) => sum + split.amountCents, 0);
        expect(totalSplit).toBe(1001);

        // Some participants should get 334 cents, others 333 cents
        const amounts = data.data.splits.map((split: any) => split.amountCents).sort();
        expect(amounts).toEqual([333, 334, 334]);
      });
    });

    describe('Percentage Split Expenses', () => {
      it('should create expense with percentage split', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        const allParticipants = participants;

        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 10000, // R$ 100.00
            description: 'Grocery shopping',
            spentAt: new Date().toISOString(),
            splitType: 'percentage',
            splits: [
              { participantId: allParticipants[0].participant_id, percentage: 50.0 },
              { participantId: allParticipants[1].participant_id, percentage: 30.0 },
              { participantId: allParticipants[2].participant_id, percentage: 20.0 }
            ]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);

        expect(data.success).toBe(true);
        expect(data.data.totalAmount).toBe(10000);
        expect(data.data.splits).toHaveLength(3);

        // Verify percentage amounts
        expect(data.data.splits[0].amountCents).toBe(5000); // 50%
        expect(data.data.splits[0].percentage).toBe(50.0);
        expect(data.data.splits[1].amountCents).toBe(3000); // 30%
        expect(data.data.splits[1].percentage).toBe(30.0);
        expect(data.data.splits[2].amountCents).toBe(2000); // 20%
        expect(data.data.splits[2].percentage).toBe(20.0);

        // Total should match exactly
        const totalSplit = data.data.splits.reduce((sum: number, split: any) => sum + split.amountCents, 0);
        expect(totalSplit).toBe(10000);
      });

      it('should reject percentage split that does not sum to 100%', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 5000,
            description: 'Invalid percentage split',
            spentAt: new Date().toISOString(),
            splitType: 'percentage',
            splits: [
              { participantId: participants[0].participant_id, percentage: 40.0 },
              { participantId: participants[1].participant_id, percentage: 30.0 }
              // Missing 30% - should total 100%
            ]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(400);
        const data = JSON.parse(response.body);
        expect(data.message).toContain('100%');
      });

      it('should handle decimal percentages with rounding', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 10000, // R$ 100.00
            description: 'Decimal percentage test',
            spentAt: new Date().toISOString(),
            splitType: 'percentage',
            splits: [
              { participantId: participants[0].participant_id, percentage: 33.33 },
              { participantId: participants[1].participant_id, percentage: 33.33 },
              { participantId: participants[2].participant_id, percentage: 33.34 }
            ]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);

        // Total should match exactly despite rounding
        const totalSplit = data.data.splits.reduce((sum: number, split: any) => sum + split.amountCents, 0);
        expect(totalSplit).toBe(10000);
      });
    });

    describe('Shares Split Expenses', () => {
      it('should create expense with shares split', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 6000, // R$ 60.00
            description: 'Shared taxi ride',
            spentAt: new Date().toISOString(),
            splitType: 'shares',
            splits: [
              { participantId: participants[0].participant_id, shares: 2 },
              { participantId: participants[1].participant_id, shares: 3 },
              { participantId: participants[2].participant_id, shares: 1 }
            ]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);

        expect(data.success).toBe(true);
        expect(data.data.totalAmount).toBe(6000);
        expect(data.data.splits).toHaveLength(3);

        // Verify share amounts (2:3:1 ratio)
        expect(data.data.splits[0].amountCents).toBe(2000); // 2/6 of total
        expect(data.data.splits[0].shares).toBe(2);
        expect(data.data.splits[1].amountCents).toBe(3000); // 3/6 of total
        expect(data.data.splits[1].shares).toBe(3);
        expect(data.data.splits[2].amountCents).toBe(1000); // 1/6 of total
        expect(data.data.splits[2].shares).toBe(1);

        // Total should match exactly
        const totalSplit = data.data.splits.reduce((sum: number, split: any) => sum + split.amountCents, 0);
        expect(totalSplit).toBe(6000);
      });

      it('should reject non-integer shares', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 5000,
            description: 'Invalid shares',
            spentAt: new Date().toISOString(),
            splitType: 'shares',
            splits: [
              { participantId: participants[0].participant_id, shares: 2.5 }, // Invalid
              { participantId: participants[1].participant_id, shares: 3 }
            ]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(400);
        const data = JSON.parse(response.body);
        expect(data.message).toContain('integer');
      });
    });

    describe('Validation and Business Rules', () => {
      it('should allow expense without payer in splits', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        const otherParticipants = participants.filter(p => p.participant_id !== payerParticipant.participant_id);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 3000,
            description: 'Payer not in splits',
            spentAt: new Date().toISOString(),
            splitType: 'equal',
            splits: otherParticipants.map(p => ({ participantId: p.participant_id }))
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
        expect(data.data.expenseId).toBeDefined();
      });

      it('should reject expense with invalid amount', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: -1000, // Invalid negative amount
            description: 'Negative amount test',
            spentAt: new Date().toISOString(),
            splitType: 'equal',
            splits: [{ participantId: payerParticipant.participant_id }]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject expense with future date', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 1000,
            description: 'Future expense',
            spentAt: futureDate.toISOString(),
            splitType: 'equal',
            splits: [{ participantId: payerParticipant.participant_id }]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(400);
        const data = JSON.parse(response.body);
        expect(data.message).toContain('Data deve ser entre');
      });

      it('should reject expense with empty description', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 1000,
            description: '', // Empty description
            spentAt: new Date().toISOString(),
            splitType: 'equal',
            splits: [{ participantId: payerParticipant.participant_id }]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject expense with too long description', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        const longDescription = 'A'.repeat(201); // Over 200 char limit
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 1000,
            description: longDescription,
            spentAt: new Date().toISOString(),
            splitType: 'equal',
            splits: [{ participantId: payerParticipant.participant_id }]
          },
          cookies: { fazopix_session: authCookie }
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject expense from non-bill member', async () => {
        // Create another user
        const otherUserResponse = await app.inject({
          method: 'POST',
          url: '/api/auth/signup',
          payload: {
            fullName: 'Other User',
            password: 'OtherPass123!',
            identifiers: [
              { type: 'PIX_EMAIL', value: 'other@example.com' }
            ]
          }
        });

        const otherAuthCookie = otherUserResponse.cookies.find(c => c.name === 'fazopix_session')?.value || '';
        const payerParticipant = participants.find(p => !p.is_placeholder);
        
        const response = await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 1000,
            description: 'Unauthorized expense',
            spentAt: new Date().toISOString(),
            splitType: 'equal',
            splits: [{ participantId: payerParticipant.participant_id }]
          },
          cookies: { fazopix_session: otherAuthCookie }
        });

        expect(response.statusCode).toBe(401);
      });

      it('should create changelog entry for expense', async () => {
        const payerParticipant = participants.find(p => !p.is_placeholder);
        
        await app.inject({
          method: 'POST',
          url: `/api/bills/${testBill.data.id}/expenses`,
          payload: {
            payerParticipantId: payerParticipant.participant_id,
            amountCents: 2500,
            description: 'Logged expense',
            spentAt: new Date().toISOString(),
            splitType: 'equal',
            splits: [{ participantId: payerParticipant.participant_id }]
          },
          cookies: { fazopix_session: authCookie }
        });

        // Check changelog
        const changelogResponse = await app.inject({
          method: 'GET',
          url: `/api/bills/${testBill.data.id}/changelog`,
          cookies: { fazopix_session: authCookie }
        });

        expect(changelogResponse.statusCode).toBe(200);
        const changelog = JSON.parse(changelogResponse.body);
        
        const expenseLog = changelog.find((entry: any) => entry.action === 'EXPENSE_ADDED');
        expect(expenseLog).toBeDefined();
        expect(expenseLog.description).toContain('Logged expense');
      });
    });

    describe('Mathematical Accuracy', () => {
      it('should maintain mathematical accuracy across multiple split types', () => {
        // Test multiple scenarios to ensure no rounding errors accumulate
        const testCases = [
          { amount: 1, participants: 3 },
          { amount: 1000, participants: 7 },
          { amount: 9999, participants: 13 },
          { amount: 100000, participants: 17 }
        ];

        testCases.forEach(({ amount, participants: participantCount }) => {
          const participantIds = Array.from({ length: participantCount }, (_, i) => `p${i}`);
          
          // Test equal split
          const equalResult = calculateEqualSplit(amount, participantIds);
          const equalTotal = equalResult.reduce((sum, split) => sum + split.amountCents, 0);
          expect(equalTotal).toBe(amount);

          // Test percentage split (equal percentages)
          const percentage = 100 / participantCount;
          const percentageSplits = participantIds.map(id => ({ participantId: id, percentage }));
          const percentageResult = calculatePercentageSplit(amount, percentageSplits);
          const percentageTotal = percentageResult.reduce((sum, split) => sum + split.amountCents, 0);
          expect(percentageTotal).toBe(amount);

          // Test shares split (equal shares)
          const sharesSplits = participantIds.map(id => ({ participantId: id, shares: 1 }));
          const sharesResult = calculateSharesSplit(amount, sharesSplits);
          const sharesTotal = sharesResult.reduce((sum, split) => sum + split.amountCents, 0);
          expect(sharesTotal).toBe(amount);
        });
      });

      it('should handle edge case amounts and participant counts', () => {
        // Test with 1 cent and many participants
        const manyParticipants = Array.from({ length: 50 }, (_, i) => `p${i}`);
        const result = calculateEqualSplit(1, manyParticipants);
        
        // First participant should get the 1 cent, others get 0
        expect(result[0].amountCents).toBe(1);
        result.slice(1).forEach(split => {
          expect(split.amountCents).toBe(0);
        });

        // Total should still be 1
        const total = result.reduce((sum, split) => sum + split.amountCents, 0);
        expect(total).toBe(1);
      });
    });
  });
});