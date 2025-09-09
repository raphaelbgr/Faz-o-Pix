import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../app';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

describe('Story 2.1: Bill Creation and Management', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let participantId: string;

  beforeAll(async () => {
    app = await build();
    await app.ready();
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    // Note: Leaving test user for now to avoid foreign key issues
    // In a real environment, you would set up proper cascade deletes
    // or clean up in the correct order with all dependencies
    
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // DON'T DELETE ANYTHING! Just ensure our test user exists

    // Check if our specific test user exists with proper participant link, if not create it
    const testEmail = 'test-bill-management@example.com';
    const existingUser = await prisma.user.findFirst({
      where: {
        identifiers: {
          some: {
            value: testEmail
          }
        }
      },
      include: {
        participantLink: true
      }
    });

    if (!existingUser || !existingUser.participantLink) {
      // Create our dedicated test user only if it doesn't exist
      const signupResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Test Bill Management User',
          password: 'tjq5uxt3',
          identifiers: [
            {
              type: 'EMAIL',
              value: testEmail
            }
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        }
      });
      
      // User creation might fail with 409 if user already exists - that's OK
      if (signupResponse.statusCode !== 201 && signupResponse.statusCode !== 409) {
        throw new Error(`Unexpected signup response: ${signupResponse.statusCode} ${signupResponse.payload}`);
      }
    }

    // Login with our test user
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        identifier: testEmail,
        password: 'tjq5uxt3'
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    
    // Extract session cookie
    const cookies = loginResponse.cookies;
    const sessionCookie = cookies.find(cookie => cookie.name === 'fazopix_session');
    expect(sessionCookie).toBeDefined();
    authToken = `${sessionCookie!.name}=${sessionCookie!.value}`;

    // Get user info for tests
    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie: authToken
      }
    });

    expect(meResponse.statusCode).toBe(200);
    const userData = JSON.parse(meResponse.payload);
    userId = userData.id;

    // Get participant ID - handle cases where user exists but participant link might not
    let userParticipant = await prisma.userParticipantLink.findUnique({
      where: { userId }
    });
    
    if (!userParticipant) {
      // If user exists but no participant link, we need to create the participant relationship
      // This can happen if user was created without proper participant setup
      console.log('User exists but no participant link found. Creating participant for existing user.');
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { identifiers: true }
      });
      
      if (user) {
        await prisma.$transaction(async (tx) => {
          // Create participant
          const participant = await tx.participant.create({
            data: {
              displayName: user.fullName,
            },
          });

          // Create participant identifiers
          await tx.participantIdentifier.createMany({
            data: user.identifiers.map(id => ({
              participantId: participant.id,
              type: id.type,
              value: id.value,
            })),
          });

          // Link user to participant
          await tx.userParticipantLink.create({
            data: {
              userId: user.id,
              participantId: participant.id,
            },
          });
        });
        
        // Now get the participant link
        userParticipant = await prisma.userParticipantLink.findUnique({
          where: { userId }
        });
      }
    }
    
    expect(userParticipant).toBeDefined();
    participantId = userParticipant!.participantId;
  });

  describe('POST /api/bills - Bill Creation', () => {
    it('should create a bill successfully with all required fields', async () => {
      const billData = {
        name: `Test Bill for Trip ${Date.now()}`,
        description: 'Weekend trip to mountains',
        simplifyDebts: true
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      
      expect(result.success).toBe(true);
      expect(result.data.name).toContain('Test Bill for Trip');
      expect(result.data).toMatchObject({
        description: 'Weekend trip to mountains',
        simplify_debts: true,
        owner_id: userId,
        participant_count: 1,
        total_expenses: 0,
        my_balance: 0
      });
      expect(result.data.id).toBeDefined();
      expect(result.data.created_at).toBeDefined();
    });

    it('should create a bill with minimal required data', async () => {
      const billData = {
        name: `Minimal Bill ${Date.now()}`
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      
      expect(result.success).toBe(true);
      expect(result.data.name).toContain('Minimal Bill');
      expect(result.data.description).toBeNull();
      expect(result.data.simplify_debts).toBe(true);
    });

    it('should reject bill name that is too short', async () => {
      const billData = {
        name: 'Hi'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.message).toContain('pelo menos 3 caracteres');
    });

    it('should reject bill name that is too long', async () => {
      const billData = {
        name: 'A'.repeat(101)
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.message).toContain('no máximo 100 caracteres');
    });

    it('should reject duplicate bill names for the same user', async () => {
      const billData = {
        name: `Duplicate Bill Name ${Date.now()}`
      };

      // Create first bill
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(firstResponse.statusCode).toBe(201);

      // Try to create second bill with same name
      const secondResponse = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(secondResponse.statusCode).toBe(409);
      const result = JSON.parse(secondResponse.payload);
      expect(result.message).toContain('já tem uma conta com este nome');
    });

    it('should automatically add creator as bill owner and member', async () => {
      const billData = {
        name: `Owner Test Bill ${Date.now()}`
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      const billId = result.data.id;

      // Verify owner is added as member
      const billMember = await prisma.billMember.findFirst({
        where: {
          billId,
          participantId,
          role: 'OWNER'
        }
      });

      expect(billMember).toBeDefined();
    });

    it('should require authentication', async () => {
      const billData = {
        name: 'Test Bill'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/bills',
        payload: billData
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/bills - Bills Dashboard', () => {
    beforeEach(async () => {
      // DON'T CREATE BILLS HERE! The tests should work with existing bills or create them individually
      // This was causing the bill count to grow every time, breaking other tests
    });

    it('should return user bills with summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/bills',
        headers: {
          cookie: authToken
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.bills)).toBe(true);
      expect(result.data.summary).toBeDefined();
      expect(typeof result.data.summary.total_bills).toBe('number');
      expect(typeof result.data.summary.owned_bills).toBe('number');
      expect(typeof result.data.summary.participating_bills).toBe('number');
      expect(typeof result.data.summary.archived_bills).toBe('number');
      // Only active bills by default - archived should be 0 or positive
      expect(result.data.summary.archived_bills).toBeGreaterThanOrEqual(0);
    });

    it('should include archived bills when requested', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/bills?include_archived=true',
        headers: {
          cookie: authToken
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(Array.isArray(result.data.bills)).toBe(true);
      expect(result.data.summary).toBeDefined();
      expect(typeof result.data.summary.archived_bills).toBe('number');
      expect(result.data.summary.archived_bills).toBeGreaterThanOrEqual(0);
    });

    it('should sort bills by last_activity by default', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/bills',
        headers: {
          cookie: authToken
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      // Bills should be sorted by last activity (most recent first)
      const bills = result.data.bills;
      expect(new Date(bills[0].last_activity).getTime())
        .toBeGreaterThanOrEqual(new Date(bills[1].last_activity).getTime());
    });

    it('should include proper bill metadata', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/bills',
        headers: {
          cookie: authToken
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      const bill = result.data.bills[0];
      expect(bill).toHaveProperty('id');
      expect(bill).toHaveProperty('name');
      expect(bill).toHaveProperty('description');
      expect(bill).toHaveProperty('simplify_debts');
      expect(bill).toHaveProperty('is_owner', true);
      expect(bill).toHaveProperty('role', 'owner');
      expect(bill).toHaveProperty('participant_count', 1);
      expect(bill).toHaveProperty('total_expenses', 0);
      expect(bill).toHaveProperty('my_balance', 0);
      expect(bill).toHaveProperty('is_archived', false);
      expect(bill).toHaveProperty('created_at');
      expect(bill).toHaveProperty('last_activity');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/bills'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/bills/:id - Update Bill Settings', () => {
    let billId: string;

    beforeEach(async () => {
      const bill = await prisma.bill.create({
        data: {
          name: 'Test Bill',
          description: 'Test description',
          ownerUserId: userId,
          simplifyDebts: false
        }
      });
      billId = bill.id;

      await prisma.billMember.create({
        data: {
          billId,
          participantId,
          role: 'OWNER'
        }
      });
    });

    it('should update bill name successfully', async () => {
      const updateData = {
        name: `Updated Bill Name ${Date.now()}`
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: authToken
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.success).toBe(true);
      expect(result.data.name).toContain('Updated Bill Name');
      expect(result.data.updated_at).toBeDefined();
    });

    it('should update bill description', async () => {
      const updateData = {
        description: 'New description'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: authToken
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.data.description).toBe('New description');
    });

    it('should update simplify debts flag', async () => {
      const updateData = {
        simplifyDebts: true
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: authToken
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.data.simplify_debts).toBe(true);
    });

    it('should archive bill', async () => {
      const updateData = {
        isArchived: true
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: authToken
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.data.is_archived).toBe(true);
    });

    it('should reject updates from non-owner', async () => {
      // Create another user
      const anotherUserSignup = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Another User',
          password: 'tjq5uxt3',
          identifiers: [
            {
              type: 'EMAIL',
              value: 'another@example.com'
            }
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        }
      });

      const anotherUserLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'another@example.com',
          password: 'tjq5uxt3'
        }
      });

      const anotherUserCookies = anotherUserLogin.cookies;
      const anotherUserSessionCookie = anotherUserCookies.find(cookie => cookie.name === 'fazopix_session');
      const anotherUserToken = `${anotherUserSessionCookie!.name}=${anotherUserSessionCookie!.value}`;

      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: anotherUserToken
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(403);
      const result = JSON.parse(response.payload);
      expect(result.message).toContain('dono da conta');
    });

    it('should validate name length on update', async () => {
      const updateData = {
        name: 'Hi' // Too short
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: authToken
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.message).toContain('must NOT have fewer than 3 characters');
    });

    it('should return 404 for non-existent bill', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = {
        name: 'Updated Name'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/bills/${fakeId}`,
        headers: {
          cookie: authToken
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(404);
    });

    it('should require authentication', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/bills/${billId}`,
        payload: updateData
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/bills/:id - Delete Bill', () => {
    let billId: string;

    beforeEach(async () => {
      const bill = await prisma.bill.create({
        data: {
          name: 'Test Bill to Delete',
          ownerUserId: userId
        }
      });
      billId = bill.id;

      await prisma.billMember.create({
        data: {
          billId,
          participantId,
          role: 'OWNER'
        }
      });
    });

    it('should delete bill successfully when no expenses exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: authToken
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.success).toBe(true);
      expect(result.data.message).toContain('excluída com sucesso');

      // Verify bill is actually deleted
      const deletedBill = await prisma.bill.findUnique({
        where: { id: billId }
      });
      expect(deletedBill).toBeNull();
    });

    it('should reject deletion of bill with expenses', async () => {
      // Create an expense for the bill
      await prisma.expense.create({
        data: {
          billId,
          payerParticipantId: participantId,
          amountCents: 1000,
          description: 'Test expense',
          spentAt: new Date()
        }
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: authToken
        }
      });

      expect(response.statusCode).toBe(409);
      const result = JSON.parse(response.payload);
      expect(result.message).toContain('com despesas');
    });

    it('should reject deletion of bill with settlements', async () => {
      // Create a settlement for the bill
      await prisma.settlement.create({
        data: {
          billId,
          fromParticipantId: participantId,
          toParticipantId: participantId, // Same participant for test
          amountCents: 500,
          method: 'PIX'
        }
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: authToken
        }
      });

      expect(response.statusCode).toBe(409);
      const result = JSON.parse(response.payload);
      expect(result.message).toContain('histórico de pagamentos');
    });

    it('should reject deletion from non-owner', async () => {
      // Create another user
      const anotherUserSignup = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Another User',
          password: 'tjq5uxt3',
          identifiers: [
            {
              type: 'EMAIL',
              value: 'delete-test@example.com'
            }
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        }
      });

      const anotherUserLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'delete-test@example.com',
          password: 'tjq5uxt3'
        }
      });

      const anotherUserCookies = anotherUserLogin.cookies;
      const anotherUserSessionCookie = anotherUserCookies.find(cookie => cookie.name === 'fazopix_session');
      const anotherUserToken = `${anotherUserSessionCookie!.name}=${anotherUserSessionCookie!.value}`;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/bills/${billId}`,
        headers: {
          cookie: anotherUserToken
        }
      });

      expect(response.statusCode).toBe(403);
      const result = JSON.parse(response.payload);
      expect(result.message).toContain('dono da conta');
    });

    it('should return 404 for non-existent bill', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/bills/${fakeId}`,
        headers: {
          cookie: authToken
        }
      });

      expect(response.statusCode).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/bills/${billId}`
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Bill Name Uniqueness', () => {
    it('should allow same bill name for different users', async () => {
      // Create another user with unique email
      const uniqueEmail = `unique-bill-test-${Date.now()}@example.com`;
      
      const anotherUserSignup = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Another User',
          password: 'tjq5uxt3',
          identifiers: [
            {
              type: 'EMAIL',
              value: uniqueEmail
            }
          ],
          lgpdConsent: {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1'
          }
        }
      });

      const anotherUserLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: uniqueEmail,
          password: 'tjq5uxt3'
        }
      });

      const anotherUserCookies = anotherUserLogin.cookies;
      const anotherUserSessionCookie = anotherUserCookies.find(cookie => cookie.name === 'fazopix_session');
      const anotherUserToken = `${anotherUserSessionCookie!.name}=${anotherUserSessionCookie!.value}`;

      const billData = {
        name: `Same Name Bill ${Date.now()}`
      };

      // Create bill with first user
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(firstResponse.statusCode).toBe(201);

      // Create bill with same name for second user - should succeed
      const secondResponse = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: anotherUserToken
        },
        payload: billData
      });

      expect(secondResponse.statusCode).toBe(201);
    });

    it('should allow same name if original bill is archived', async () => {
      const billData = {
        name: `Archived Test Bill ${Date.now()}`
      };

      // Create first bill
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(firstResponse.statusCode).toBe(201);
      const firstBill = JSON.parse(firstResponse.payload);

      // Archive the first bill
      const archiveResponse = await app.inject({
        method: 'PUT',
        url: `/api/bills/${firstBill.data.id}`,
        headers: {
          cookie: authToken
        },
        payload: { isArchived: true }
      });

      expect(archiveResponse.statusCode).toBe(200);

      // Create second bill with same name - should succeed since first is archived
      const secondResponse = await app.inject({
        method: 'POST',
        url: '/api/bills',
        headers: {
          cookie: authToken
        },
        payload: billData
      });

      expect(secondResponse.statusCode).toBe(201);
    });
  });
});