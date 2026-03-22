const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDatabase() {
  try {
    console.log('🔍 Checking database contents...\n');
    
    // Check users
    const users = await prisma.user.findMany({
      include: {
        identifiers: true,
      }
    });
    
    console.log(`📊 Found ${users.length} users in database:`);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.fullName} (ID: ${user.id})`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Identifiers:`);
      
      for (const identifier of user.identifiers) {
        console.log(`     - ${identifier.type}: "${identifier.value}"`);
      }
    }
    
    // Check the specific identifier being used in login
    const phoneIdentifier = '+5521988856697';
    console.log(`\n🔍 Searching for identifier: "${phoneIdentifier}"`);
    
    const foundIdentifier = await prisma.identifier.findFirst({
      where: {
        OR: [
          { value: phoneIdentifier },
          { value: '5521988856697' }, // Without + prefix
          { value: '21988856697' }, // Without country code
        ]
      },
      include: {
        user: true
      }
    });
    
    if (foundIdentifier) {
      console.log(`✅ Found identifier: ${foundIdentifier.type} = "${foundIdentifier.value}"`);
      console.log(`   User: ${foundIdentifier.user.fullName}`);
    } else {
      console.log(`❌ No identifier found matching "${phoneIdentifier}"`);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase();