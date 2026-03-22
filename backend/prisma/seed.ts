import { PrismaClient, IdentifierType, ShareType, SettlementMethod } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.$transaction([
    prisma.settlement.deleteMany(),
    prisma.expenseSplit.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.billMember.deleteMany(),
    prisma.bill.deleteMany(),
    prisma.userParticipantLink.deleteMany(),
    prisma.participantIdentifier.deleteMany(),
    prisma.participant.deleteMany(),
    prisma.session.deleteMany(),
    prisma.identifier.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create test users  
  const passwordHash = await hashPassword('tjq5uxt3');

  // User 1: João
  const joao = await prisma.user.create({
    data: {
      fullName: 'João Silva',
      passwordHash,
    },
  });

  await prisma.identifier.createMany({
    data: [
      { userId: joao.id, type: IdentifierType.PIX_CPF, value: '11111111111' },
      { userId: joao.id, type: IdentifierType.EMAIL, value: 'joao@example.com' },
      { userId: joao.id, type: IdentifierType.PIX_PHONE, value: '+5511999999999' },
    ],
  });

  // User 2: Maria
  const maria = await prisma.user.create({
    data: {
      fullName: 'Maria Santos',
      passwordHash,
    },
  });

  await prisma.identifier.createMany({
    data: [
      { userId: maria.id, type: IdentifierType.PIX_CPF, value: '22222222222' },
      { userId: maria.id, type: IdentifierType.EMAIL, value: 'maria@example.com' },
      { userId: maria.id, type: IdentifierType.PIX_PHONE, value: '+5511888888888' },
    ],
  });

  // User 3: Pedro
  const pedro = await prisma.user.create({
    data: {
      fullName: 'Pedro Costa',
      passwordHash,
    },
  });

  await prisma.identifier.createMany({
    data: [
      { userId: pedro.id, type: IdentifierType.PIX_CPF, value: '33333333333' },
      { userId: pedro.id, type: IdentifierType.EMAIL, value: 'pedro@example.com' },
    ],
  });

  // Create participants for users
  const joaoParticipant = await prisma.participant.create({
    data: { displayName: 'João Silva' },
  });

  await prisma.participantIdentifier.createMany({
    data: [
      { participantId: joaoParticipant.id, type: IdentifierType.PIX_CPF, value: '11111111111' },
      { participantId: joaoParticipant.id, type: IdentifierType.EMAIL, value: 'joao@example.com' },
      { participantId: joaoParticipant.id, type: IdentifierType.PIX_PHONE, value: '+5511999999999' },
    ],
  });

  await prisma.userParticipantLink.create({
    data: {
      userId: joao.id,
      participantId: joaoParticipant.id,
    },
  });

  const mariaParticipant = await prisma.participant.create({
    data: { displayName: 'Maria Santos' },
  });

  await prisma.participantIdentifier.createMany({
    data: [
      { participantId: mariaParticipant.id, type: IdentifierType.PIX_CPF, value: '22222222222' },
      { participantId: mariaParticipant.id, type: IdentifierType.EMAIL, value: 'maria@example.com' },
      { participantId: mariaParticipant.id, type: IdentifierType.PIX_PHONE, value: '+5511888888888' },
    ],
  });

  await prisma.userParticipantLink.create({
    data: {
      userId: maria.id,
      participantId: mariaParticipant.id,
    },
  });

  const pedroParticipant = await prisma.participant.create({
    data: { displayName: 'Pedro Costa' },
  });

  await prisma.participantIdentifier.createMany({
    data: [
      { participantId: pedroParticipant.id, type: IdentifierType.PIX_CPF, value: '33333333333' },
      { participantId: pedroParticipant.id, type: IdentifierType.EMAIL, value: 'pedro@example.com' },
    ],
  });

  await prisma.userParticipantLink.create({
    data: {
      userId: pedro.id,
      participantId: pedroParticipant.id,
    },
  });

  // Create a placeholder participant (not registered)
  const anaParticipant = await prisma.participant.create({
    data: { displayName: 'Ana Oliveira' },
  });

  await prisma.participantIdentifier.create({
    data: {
      participantId: anaParticipant.id,
      type: IdentifierType.PIX_PHONE,
      value: '+5511777777777',
    },
  });

  // Create a bill
  const churrasBill = await prisma.bill.create({
    data: {
      ownerUserId: joao.id,
      name: 'Churrasco do Fim de Semana',
      description: 'Churrasco na casa do João',
      simplifyDebts: true,
    },
  });

  // Add members to bill
  await prisma.billMember.createMany({
    data: [
      { billId: churrasBill.id, participantId: joaoParticipant.id, role: 'OWNER' },
      { billId: churrasBill.id, participantId: mariaParticipant.id, role: 'MEMBER' },
      { billId: churrasBill.id, participantId: pedroParticipant.id, role: 'MEMBER' },
      { billId: churrasBill.id, participantId: anaParticipant.id, role: 'MEMBER' },
    ],
  });

  // Create expenses
  const expense1 = await prisma.expense.create({
    data: {
      billId: churrasBill.id,
      payerParticipantId: joaoParticipant.id,
      amountCents: 20000, // R$ 200.00
      description: 'Carne e carvão',
      spentAt: new Date('2025-01-05'),
    },
  });

  // Equal split among all
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense1.id, participantId: joaoParticipant.id, shareType: ShareType.EQUAL, shareValue: 1, amountCents: 5000 },
      { expenseId: expense1.id, participantId: mariaParticipant.id, shareType: ShareType.EQUAL, shareValue: 1, amountCents: 5000 },
      { expenseId: expense1.id, participantId: pedroParticipant.id, shareType: ShareType.EQUAL, shareValue: 1, amountCents: 5000 },
      { expenseId: expense1.id, participantId: anaParticipant.id, shareType: ShareType.EQUAL, shareValue: 1, amountCents: 5000 },
    ],
  });

  const expense2 = await prisma.expense.create({
    data: {
      billId: churrasBill.id,
      payerParticipantId: mariaParticipant.id,
      amountCents: 8000, // R$ 80.00
      description: 'Bebidas',
      spentAt: new Date('2025-01-05'),
    },
  });

  // Split among three (Ana doesn't drink)
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense2.id, participantId: joaoParticipant.id, shareType: ShareType.EQUAL, shareValue: 1, amountCents: 2667 },
      { expenseId: expense2.id, participantId: mariaParticipant.id, shareType: ShareType.EQUAL, shareValue: 1, amountCents: 2667 },
      { expenseId: expense2.id, participantId: pedroParticipant.id, shareType: ShareType.EQUAL, shareValue: 1, amountCents: 2666 },
    ],
  });

  const expense3 = await prisma.expense.create({
    data: {
      billId: churrasBill.id,
      payerParticipantId: pedroParticipant.id,
      amountCents: 4000, // R$ 40.00
      description: 'Saladas e acompanhamentos',
      spentAt: new Date('2025-01-05'),
    },
  });

  // Percentage split
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense3.id, participantId: joaoParticipant.id, shareType: ShareType.PERCENT, shareValue: 30, amountCents: 1200 },
      { expenseId: expense3.id, participantId: mariaParticipant.id, shareType: ShareType.PERCENT, shareValue: 30, amountCents: 1200 },
      { expenseId: expense3.id, participantId: pedroParticipant.id, shareType: ShareType.PERCENT, shareValue: 20, amountCents: 800 },
      { expenseId: expense3.id, participantId: anaParticipant.id, shareType: ShareType.PERCENT, shareValue: 20, amountCents: 800 },
    ],
  });

  // Record a settlement
  await prisma.settlement.create({
    data: {
      billId: churrasBill.id,
      fromParticipantId: pedroParticipant.id,
      toParticipantId: joaoParticipant.id,
      amountCents: 2000, // R$ 20.00
      method: SettlementMethod.PIX,
      reference: 'E12345678901234567890123456789012',
      note: 'Parte do churrasco',
    },
  });

  // Create another bill (apartment expenses)
  const aptBill = await prisma.bill.create({
    data: {
      ownerUserId: maria.id,
      name: 'Despesas do Apartamento',
      description: 'Contas mensais do AP',
      simplifyDebts: false,
    },
  });

  await prisma.billMember.createMany({
    data: [
      { billId: aptBill.id, participantId: mariaParticipant.id, role: 'OWNER' },
      { billId: aptBill.id, participantId: joaoParticipant.id, role: 'MEMBER' },
    ],
  });

  const rentExpense = await prisma.expense.create({
    data: {
      billId: aptBill.id,
      payerParticipantId: mariaParticipant.id,
      amountCents: 200000, // R$ 2000.00
      description: 'Aluguel Janeiro',
      spentAt: new Date('2025-01-01'),
    },
  });

  // Custom shares (60/40 split)
  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: rentExpense.id, participantId: mariaParticipant.id, shareType: ShareType.SHARES, shareValue: 60, amountCents: 120000 },
      { expenseId: rentExpense.id, participantId: joaoParticipant.id, shareType: ShareType.SHARES, shareValue: 40, amountCents: 80000 },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('- João: joao@example.com / tjq5uxt3');
  console.log('- Maria: maria@example.com / tjq5uxt3');
  console.log('- Pedro: pedro@example.com / tjq5uxt3');
  console.log('\nYou can also login with CPF or phone number');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });