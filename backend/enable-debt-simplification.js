const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enableDebtSimplification() {
  try {
    console.log('🔄 Enabling debt simplification for existing bills...\n');
    
    // Update all existing bills to have debt simplification enabled
    const result = await prisma.bill.updateMany({
      where: {
        simplifyDebts: false
      },
      data: {
        simplifyDebts: true
      }
    });
    
    console.log(`✅ Updated ${result.count} bills to enable debt simplification`);
    
    // Show current status
    const totalBills = await prisma.bill.count();
    const simplifiedBills = await prisma.bill.count({
      where: { simplifyDebts: true }
    });
    
    console.log(`📊 Status: ${simplifiedBills}/${totalBills} bills now have debt simplification enabled`);
    
  } catch (error) {
    console.error('❌ Error updating bills:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableDebtSimplification();