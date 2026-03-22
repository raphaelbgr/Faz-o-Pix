import 'dotenv/config';
import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

beforeAll(async () => {
  // DO NOT DELETE ANY DATA AT ALL - just initialize
  console.log('Test environment initialized - preserving all existing data');
});

afterAll(async () => {
  // DO NOT DELETE ANY DATA AT ALL - just disconnect
  await prisma.$disconnect();
});

async function cleanTestData() {
  // Only clean up test data - preserve the real user data the user mentioned
  // The user said there's a user with "+5521988856697" that we must not touch
  
  // Clean up only test-specific data
  const testEmails = [
    'test-bill-management@example.com',
    'joao@example.com',
    'maria@example.com', 
    'pedro@example.com',
    'ana@unique.com',
    'logouttest@example.com'
  ];
  
  const testPhones = [
    '11999887766',
    '+5511999999999',
    '+5511888888888'
  ];
  
  const testCPFs = [
    '11111111111',
    '22222222222', 
    '33333333333',
    '11144477735'
  ];
  
  // Clean up settlements/expenses/bills related to test users only
  // First find users by name patterns
  const usersByName = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Test' } },
        { fullName: { in: ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira'] } }
      ]
    }
  });

  // Find users by identifiers
  const identifierUsers = await prisma.identifier.findMany({
    where: {
      value: { in: [...testEmails, ...testPhones, ...testCPFs] }
    },
    select: { userId: true }
  });

  const userIdsByIdentifiers = identifierUsers.map(i => i.userId);
  const usersViaIdentifiers = userIdsByIdentifiers.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIdsByIdentifiers } }
  }) : [];

  // Combine all test users
  const testUsers = [...usersByName, ...usersViaIdentifiers];
  
  // Remove duplicates
  const uniqueTestUsers = testUsers.filter((user, index, self) => 
    index === self.findIndex(u => u.id === user.id)
  );
  
  const testUserIds = uniqueTestUsers.map(u => u.id);
  
  if (testUserIds.length > 0) {
    // Clean up bills owned by test users
    const testBills = await prisma.bill.findMany({
      where: { ownerUserId: { in: testUserIds } },
      select: { id: true }
    });
    const testBillIds = testBills.map(b => b.id);

    if (testBillIds.length > 0) {
      await prisma.settlement.deleteMany({ where: { billId: { in: testBillIds } } });
      
      // Get expenses for test bills
      const testExpenses = await prisma.expense.findMany({
        where: { billId: { in: testBillIds } },
        select: { id: true }
      });
      const testExpenseIds = testExpenses.map(e => e.id);
      
      if (testExpenseIds.length > 0) {
        await prisma.expenseSplit.deleteMany({ where: { expenseId: { in: testExpenseIds } } });
        await prisma.expense.deleteMany({ where: { id: { in: testExpenseIds } } });
      }
      
      await prisma.billMember.deleteMany({ where: { billId: { in: testBillIds } } });
      await prisma.bill.deleteMany({ where: { id: { in: testBillIds } } });
    }
    
    // Clean up test users and their data
    await prisma.userParticipantLink.deleteMany({ where: { userId: { in: testUserIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: testUserIds } } });
    await prisma.identifier.deleteMany({ where: { userId: { in: testUserIds } } });
    
    // Clean up test participants
    await prisma.participantIdentifier.deleteMany({
      where: { value: { in: [...testEmails, ...testPhones, ...testCPFs] } }
    });
    
    const testParticipants = await prisma.participant.findMany({
      where: {
        OR: [
          { displayName: { contains: 'Test' } },
          { displayName: { in: ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira'] } }
        ]
      }
    });
    
    const testParticipantIds = testParticipants.map(p => p.id);
    if (testParticipantIds.length > 0) {
      await prisma.participant.deleteMany({ where: { id: { in: testParticipantIds } } });
    }
    
    // Finally delete test users
    await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
  }
}

export { prisma };