const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

function normalizeIdentifier(type, value) {
  switch (type) {
    case 'PIX_CPF':
      return value.replace(/\D/g, '');
    case 'PIX_CNPJ':
      return value.replace(/\D/g, '');
    case 'PIX_PHONE':
      return value.replace(/\D/g, '');
    case 'PIX_EMAIL':
      return value.toLowerCase().trim();
    case 'PIX_EVP':
      return value.toLowerCase().trim();
    default:
      return value.trim();
  }
}

async function createTestUser() {
  try {
    console.log('👤 Creating test user...\n');
    
    // Hash the password
    const password = 'Tjq5uxt3!';
    const passwordHash = await argon2.hash(password);
    
    console.log('🔒 Password hashed successfully');
    
    const fullName = 'Test User';
    const identifiers = [
      {
        type: 'PIX_PHONE',
        value: '5521988856697'
      }
    ];
    
    // Create user following the same pattern as signup route
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          fullName,
          passwordHash,
        },
      });

      // Create identifiers
      await tx.identifier.createMany({
        data: identifiers.map(id => ({
          userId: newUser.id,
          type: id.type,
          value: normalizeIdentifier(id.type, id.value),
        })),
      });

      // Create participant for the user
      const participant = await tx.participant.create({
        data: {
          displayName: fullName,
        },
      });

      // Create participant identifiers (same as user identifiers)
      await tx.participantIdentifier.createMany({
        data: identifiers.map(id => ({
          participantId: participant.id,
          type: id.type,
          value: normalizeIdentifier(id.type, id.value),
        })),
      });

      // Link user to participant
      await tx.userParticipantLink.create({
        data: {
          userId: newUser.id,
          participantId: participant.id,
        },
      });

      return newUser;
    });
    
    // Get created user with identifiers
    const userWithIdentifiers = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        identifiers: true
      }
    });
    
    console.log('✅ Test user created successfully!');
    console.log(`   Name: ${userWithIdentifiers.fullName}`);
    console.log(`   ID: ${userWithIdentifiers.id}`);
    console.log(`   Identifiers:`);
    
    for (const identifier of userWithIdentifiers.identifiers) {
      console.log(`     - ${identifier.type}: "${identifier.value}"`);
    }
    
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Phone: +5521988856697 (or 5521988856697)`);
    console.log(`   Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();