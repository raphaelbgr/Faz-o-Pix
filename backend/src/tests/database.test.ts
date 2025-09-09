import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

describe('Story 1.2: Database Schema and Prisma Setup', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Database Connection and Schema', () => {
    it('should connect to PostgreSQL database successfully', async () => {
      const result = await prisma.$queryRaw`SELECT version()` as any[]
      expect(result[0].version).toContain('PostgreSQL')
    })

    it('should have all required tables created', async () => {
      const tables = await prisma.$queryRaw`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      ` as any[]

      const tableNames = tables.map(t => t.tablename)
      
      // Check all main entities exist (using snake_case table names)
      expect(tableNames).toContain('users')
      expect(tableNames).toContain('identifiers')
      expect(tableNames).toContain('sessions')
      expect(tableNames).toContain('participants')
      expect(tableNames).toContain('participant_identifiers')
      expect(tableNames).toContain('users_participants_link')
      expect(tableNames).toContain('bills')
      expect(tableNames).toContain('bill_members')
      expect(tableNames).toContain('expenses')
      expect(tableNames).toContain('expense_splits')
      expect(tableNames).toContain('settlements')
      expect(tableNames).toContain('bill_changelog')
    })

    it('should have proper foreign key relationships', async () => {
      const constraints = await prisma.$queryRaw`
        SELECT 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
        ORDER BY tc.table_name, tc.constraint_name
      ` as any[]

      // Check key relationships exist
      const relationships = constraints.map(c => ({
        table: c.table_name,
        column: c.column_name,
        foreignTable: c.foreign_table_name,
        foreignColumn: c.foreign_column_name
      }))

      // User -> Identifier relationship
      expect(relationships).toContainEqual(
        expect.objectContaining({
          table: 'identifiers',
          column: 'user_id',
          foreignTable: 'users',
          foreignColumn: 'id'
        })
      )

      // Bill -> User relationship
      expect(relationships).toContainEqual(
        expect.objectContaining({
          table: 'bills',
          column: 'owner_user_id',
          foreignTable: 'users',
          foreignColumn: 'id'
        })
      )
    })
  })

  describe('Brazilian Identifier Support', () => {
    it('should support all Brazilian identifier types in enum', async () => {
      const enumValues = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::\"IdentifierType\")) as identifier_type
      ` as any[]

      const types = enumValues.map(v => v.identifier_type)
      
      expect(types).toContain('PIX_CPF')
      expect(types).toContain('PIX_CNPJ')
      expect(types).toContain('PIX_EMAIL')
      expect(types).toContain('PIX_PHONE')
      expect(types).toContain('PIX_EVP')
    })

    it('should create and validate Brazilian identifiers', async () => {
      // Clean up any existing test data
      await prisma.identifier.deleteMany({
        where: { value: { in: ['11144477735', 'test@example.com'] } }
      })
      await prisma.user.deleteMany({
        where: { fullName: 'Test User Schema' }
      })

      // Create test user
      const user = await prisma.user.create({
        data: {
          fullName: 'Test User Schema',
          passwordHash: 'hashed_password_test'
        }
      })

      // Create Brazilian identifiers
      const cpfIdentifier = await prisma.identifier.create({
        data: {
          userId: user.id,
          type: 'PIX_CPF',
          value: '11144477735'
        }
      })

      const emailIdentifier = await prisma.identifier.create({
        data: {
          userId: user.id,
          type: 'PIX_EMAIL',
          value: 'test@example.com'
        }
      })

      expect(cpfIdentifier.type).toBe('PIX_CPF')
      expect(cpfIdentifier.value).toBe('11144477735')
      expect(emailIdentifier.type).toBe('PIX_EMAIL')
      expect(emailIdentifier.value).toBe('test@example.com')

      // Verify unique constraint on identifier value
      await expect(
        prisma.identifier.create({
          data: {
            userId: user.id,
            type: 'PIX_CPF',
            value: '11144477735' // Duplicate value
          }
        })
      ).rejects.toThrow()

      // Clean up
      await prisma.identifier.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('should support participant identifier system', async () => {
      // Clean up
      await prisma.userParticipantLink.deleteMany({})
      await prisma.participantIdentifier.deleteMany({})
      await prisma.participant.deleteMany({
        where: { displayName: 'Test Participant' }
      })

      // Create participant with identifier
      const participant = await prisma.participant.create({
        data: {
          displayName: 'Test Participant'
        }
      })

      const participantIdentifier = await prisma.participantIdentifier.create({
        data: {
          participantId: participant.id,
          type: 'PIX_EMAIL',
          value: 'participant@test.com'
        }
      })

      expect(participantIdentifier.type).toBe('PIX_EMAIL')
      expect(participantIdentifier.participantId).toBe(participant.id)

      // Clean up
      await prisma.participantIdentifier.delete({ where: { id: participantIdentifier.id } })
      await prisma.participant.delete({ where: { id: participant.id } })
    })
  })

  describe('3NF Normalization', () => {
    it('should have proper user and participant separation', async () => {
      // Clean up
      await prisma.userParticipantLink.deleteMany({})
      await prisma.identifier.deleteMany({
        where: { value: 'normalization@test.com' }
      })
      await prisma.participantIdentifier.deleteMany({
        where: { value: 'normalization@test.com' }
      })
      await prisma.participant.deleteMany({
        where: { displayName: 'Normalization Test' }
      })
      await prisma.user.deleteMany({
        where: { fullName: 'Normalization Test User' }
      })

      // Create user
      const user = await prisma.user.create({
        data: {
          fullName: 'Normalization Test User',
          passwordHash: 'hashed_password'
        }
      })

      // Create participant
      const participant = await prisma.participant.create({
        data: {
          displayName: 'Normalization Test'
        }
      })

      // Link user to participant
      const link = await prisma.userParticipantLink.create({
        data: {
          userId: user.id,
          participantId: participant.id
        }
      })

      // Create identifiers in both tables
      const userIdentifier = await prisma.identifier.create({
        data: {
          userId: user.id,
          type: 'PIX_EMAIL',
          value: 'normalization@test.com'
        }
      })

      const participantIdentifier = await prisma.participantIdentifier.create({
        data: {
          participantId: participant.id,
          type: 'PIX_EMAIL',
          value: 'normalization@test.com'
        }
      })

      // Verify relationships
      expect(link.userId).toBe(user.id)
      expect(link.participantId).toBe(participant.id)
      expect(userIdentifier.value).toBe(participantIdentifier.value)

      // Clean up
      await prisma.userParticipantLink.delete({ where: { participantId_userId: { participantId: participant.id, userId: user.id } } })
      await prisma.identifier.delete({ where: { id: userIdentifier.id } })
      await prisma.participantIdentifier.delete({ where: { id: participantIdentifier.id } })
      await prisma.participant.delete({ where: { id: participant.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('should separate bill and expense entities properly', async () => {
      // Clean up
      await prisma.expenseSplit.deleteMany({})
      await prisma.expense.deleteMany({
        where: { description: 'Test Expense Normalization' }
      })
      await prisma.billMember.deleteMany({})
      await prisma.bill.deleteMany({
        where: { name: 'Test Bill Normalization' }
      })
      await prisma.identifier.deleteMany({
        where: { value: 'billowner@test.com' }
      })
      await prisma.user.deleteMany({
        where: { fullName: 'Bill Owner Test' }
      })

      // Create user first
      const user = await prisma.user.create({
        data: {
          fullName: 'Bill Owner Test',
          passwordHash: 'hashed_password'
        }
      })

      // Create participant for the expense payer
      const participant = await prisma.participant.create({
        data: {
          displayName: 'Test Participant'
        }
      })

      // Create bill - make sure the user exists
      const bill = await prisma.bill.create({
        data: {
          name: 'Test Bill Normalization',
          description: 'Testing 3NF normalization',
          ownerUserId: user.id
        }
      })

      // Create expense
      const expense = await prisma.expense.create({
        data: {
          billId: bill.id,
          description: 'Test Expense Normalization',
          amountCents: 5000,
          payerParticipantId: participant.id,
          spentAt: new Date()
        }
      })

      // Verify separation
      expect(bill.id).toBeDefined()
      expect(expense.billId).toBe(bill.id)
      expect(bill.ownerUserId).toBe(user.id)
      expect(expense.payerParticipantId).toBe(participant.id)

      // Clean up
      await prisma.expense.delete({ where: { id: expense.id } })
      await prisma.bill.delete({ where: { id: bill.id } })
      await prisma.participant.delete({ where: { id: participant.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })
  })

  describe('LGPD Compliance Audit Structure', () => {
    it('should have changelog table for LGPD compliance', async () => {
      const changelogTableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'bill_changelog'
        );
      ` as any[]

      expect(changelogTableExists[0].exists).toBe(true)
    })

    it('should support bill changelog entries for audit trail', async () => {
      // Clean up
      await prisma.billChangelog.deleteMany({
        where: { description: 'Test audit entry' }
      })
      await prisma.bill.deleteMany({
        where: { name: 'Test Audit Bill' }
      })
      await prisma.user.deleteMany({
        where: { fullName: 'Test Audit User' }
      })

      // Create user
      const user = await prisma.user.create({
        data: {
          fullName: 'Test Audit User',
          passwordHash: 'hashed_password'
        }
      })

      // Create bill
      const bill = await prisma.bill.create({
        data: {
          name: 'Test Audit Bill',
          description: 'Testing audit functionality',
          ownerUserId: user.id
        }
      })

      const changelogEntry = await prisma.billChangelog.create({
        data: {
          billId: bill.id,
          userId: user.id,
          action: 'EXPENSE_ADDED',
          entityType: 'EXPENSE',
          entityId: 'test-expense-id',
          description: 'Test audit entry',
          metadata: {
            amount: 1000,
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent'
          }
        }
      })

      expect(changelogEntry.action).toBe('EXPENSE_ADDED')
      expect(changelogEntry.entityType).toBe('EXPENSE')
      expect(changelogEntry.createdAt).toBeDefined()

      // Verify JSON metadata parsing
      const metadata = changelogEntry.metadata as any
      expect(metadata.amount).toBe(1000)
      expect(metadata.ipAddress).toBe('127.0.0.1')

      // Clean up
      await prisma.billChangelog.delete({ where: { id: changelogEntry.id } })
      await prisma.bill.delete({ where: { id: bill.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('should have user timestamps for data retention tracking', async () => {
      // Clean up
      await prisma.identifier.deleteMany({
        where: { value: 'retention@test.com' }
      })
      await prisma.user.deleteMany({
        where: { fullName: 'Retention Test User' }
      })

      const user = await prisma.user.create({
        data: {
          fullName: 'Retention Test User',
          passwordHash: 'hashed_password'
        }
      })

      expect(user.createdAt).toBeDefined()
      expect(user.updatedAt).toBeDefined()
      expect(user.createdAt instanceof Date).toBe(true)

      // Clean up
      await prisma.user.delete({ where: { id: user.id } })
    })
  })

  describe('Data Integrity Constraints', () => {
    it('should enforce NOT NULL constraints on required fields', async () => {
      // Test user requires fullName and passwordHash
      await expect(
        prisma.user.create({
          data: {
            passwordHash: 'test'
            // missing fullName
          } as any
        })
      ).rejects.toThrow()

      // Test identifier requires type and value and userId
      await expect(
        prisma.identifier.create({
          data: {
            type: 'PIX_EMAIL'
            // missing value and userId
          } as any
        })
      ).rejects.toThrow()
    })

    it('should enforce unique constraints', async () => {
      // Clean up
      await prisma.identifier.deleteMany({
        where: { value: 'unique@test.com' }
      })
      await prisma.user.deleteMany({
        where: { fullName: 'Unique Test User' }
      })

      const user = await prisma.user.create({
        data: {
          fullName: 'Unique Test User',
          passwordHash: 'hashed_password'
        }
      })

      // First identifier should succeed
      const identifier1 = await prisma.identifier.create({
        data: {
          userId: user.id,
          type: 'PIX_EMAIL',
          value: 'unique@test.com'
        }
      })

      // Second identifier with same value should fail
      await expect(
        prisma.identifier.create({
          data: {
            userId: user.id,
            type: 'PIX_EMAIL',
            value: 'unique@test.com' // Duplicate
          }
        })
      ).rejects.toThrow()

      // Clean up
      await prisma.identifier.delete({ where: { id: identifier1.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })
  })
})