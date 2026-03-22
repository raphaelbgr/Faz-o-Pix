const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDebtSimplification() {
  try {
    console.log('🧪 Testing debt simplification...\n');
    
    // Find a test user
    const user = await prisma.user.findFirst({
      where: {
        fullName: 'Test User'
      }
    });
    
    if (!user) {
      console.log('❌ No test user found. Run create-test-user.js first.');
      return;
    }
    
    console.log(`👤 Using test user: ${user.fullName} (ID: ${user.id})`);
    
    // Create a test bill
    const bill = await prisma.bill.create({
      data: {
        name: 'Test Bill - Debt Simplification',
        description: 'Testing automatic debt simplification',
        ownerUserId: user.id,
        // Don't specify simplifyDebts - should default to true
      },
    });
    
    console.log(`✅ Created bill: ${bill.name}`);
    console.log(`   ID: ${bill.id}`);
    console.log(`   Debt simplification enabled: ${bill.simplifyDebts}`);
    
    if (bill.simplifyDebts) {
      console.log('🎉 SUCCESS: Debt simplification is automatically enabled!');
    } else {
      console.log('❌ FAILED: Debt simplification is not enabled');
    }
    
    // Clean up - delete the test bill
    await prisma.bill.delete({
      where: { id: bill.id }
    });
    
    console.log('🧹 Test bill cleaned up');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDebtSimplification();