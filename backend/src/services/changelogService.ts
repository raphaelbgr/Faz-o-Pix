import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

export interface ChangelogEntry {
  billId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: any;
}

export class ChangelogService {
  constructor(
    private fastify: FastifyInstance,
    private prisma: PrismaClient
  ) {}

  async createEntry(entry: ChangelogEntry): Promise<void> {
    // Create changelog entry
    const changelog = await this.prisma.billChangelog.create({
      data: {
        billId: entry.billId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        description: entry.description,
        metadata: entry.metadata,
      },
      include: {
        user: {
          select: { fullName: true },
        },
      },
    });

    // Broadcast to WebSocket clients
    this.fastify.broadcastToBill(entry.billId, {
      type: 'BILL_UPDATED',
      action: entry.action,
      data: changelog,
    });
  }

  async getRecentChangelog(billId: string, limit = 20) {
    return this.prisma.billChangelog.findMany({
      where: { billId },
      include: {
        user: {
          select: { fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Helper methods for different types of changes
  async logExpenseAdded(billId: string, userId: string, expenseId: string, description: string, amount: number) {
    await this.createEntry({
      billId,
      userId,
      action: 'EXPENSE_ADDED',
      entityType: 'EXPENSE',
      entityId: expenseId,
      description: `Adicionou gasto: ${description}`,
      metadata: { amount },
    });
  }

  async logExpenseUpdated(billId: string, userId: string, expenseId: string, description: string, changes: any) {
    await this.createEntry({
      billId,
      userId,
      action: 'EXPENSE_UPDATED',
      entityType: 'EXPENSE',
      entityId: expenseId,
      description: `Editou gasto: ${description}`,
      metadata: { changes },
    });
  }

  async logExpenseDeleted(billId: string, userId: string, description: string) {
    await this.createEntry({
      billId,
      userId,
      action: 'EXPENSE_DELETED',
      entityType: 'EXPENSE',
      description: `Removeu gasto: ${description}`,
    });
  }

  async logMemberAdded(billId: string, userId: string, memberName: string) {
    await this.createEntry({
      billId,
      userId,
      action: 'MEMBER_ADDED',
      entityType: 'MEMBER',
      description: `Adicionou participante: ${memberName}`,
    });
  }

  async logSettlementAdded(billId: string, userId: string, settlementId: string, fromName: string, toName: string, amount: number) {
    await this.createEntry({
      billId,
      userId,
      action: 'SETTLEMENT_ADDED',
      entityType: 'SETTLEMENT',
      entityId: settlementId,
      description: `Registrou pagamento: ${fromName} → ${toName}`,
      metadata: { amount },
    });
  }
}