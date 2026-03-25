import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangelogService } from './changelogService';

function createMockFastify() {
  return {
    broadcastToBill: vi.fn(),
  } as any;
}

function createMockPrisma() {
  return {
    billChangelog: {
      create: vi.fn().mockResolvedValue({
        id: 'changelog-1',
        billId: 'bill-1',
        userId: 'user-1',
        action: 'EXPENSE_ADDED',
        entityType: 'EXPENSE',
        entityId: 'expense-1',
        description: 'Adicionou gasto: Almoço',
        metadata: { amount: 5000 },
        createdAt: new Date(),
        user: { fullName: 'João' },
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('ChangelogService', () => {
  let service: ChangelogService;
  let mockFastify: ReturnType<typeof createMockFastify>;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockFastify = createMockFastify();
    mockPrisma = createMockPrisma();
    service = new ChangelogService(mockFastify, mockPrisma);
  });

  it('should create a changelog entry and broadcast', async () => {
    await service.createEntry({
      billId: 'bill-1',
      userId: 'user-1',
      action: 'EXPENSE_ADDED',
      entityType: 'EXPENSE',
      entityId: 'expense-1',
      description: 'Adicionou gasto: Almoço',
      metadata: { amount: 5000 },
    });

    expect(mockPrisma.billChangelog.create).toHaveBeenCalledOnce();
    expect(mockFastify.broadcastToBill).toHaveBeenCalledWith('bill-1', expect.objectContaining({
      type: 'BILL_UPDATED',
      action: 'EXPENSE_ADDED',
    }));
  });

  it('should log expense added with correct description', async () => {
    await service.logExpenseAdded('bill-1', 'user-1', 'expense-1', 'Almoço', 5000);

    expect(mockPrisma.billChangelog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'EXPENSE_ADDED',
        entityType: 'EXPENSE',
        description: 'Adicionou gasto: Almoço',
      }),
    }));
  });

  it('should log expense updated', async () => {
    await service.logExpenseUpdated('bill-1', 'user-1', 'expense-1', 'Jantar', { amountCents: 3000 });

    expect(mockPrisma.billChangelog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'EXPENSE_UPDATED',
        description: 'Editou gasto: Jantar',
      }),
    }));
  });

  it('should log expense deleted', async () => {
    await service.logExpenseDeleted('bill-1', 'user-1', 'Café');

    expect(mockPrisma.billChangelog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'EXPENSE_DELETED',
        description: 'Removeu gasto: Café',
      }),
    }));
  });

  it('should log member added', async () => {
    await service.logMemberAdded('bill-1', 'user-1', 'Maria');

    expect(mockPrisma.billChangelog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'MEMBER_ADDED',
        description: 'Adicionou participante: Maria',
      }),
    }));
  });

  it('should log settlement added', async () => {
    await service.logSettlementAdded('bill-1', 'user-1', 'settlement-1', 'João', 'Maria', 2500);

    expect(mockPrisma.billChangelog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'SETTLEMENT_ADDED',
        description: 'Registrou pagamento: João → Maria',
      }),
    }));
  });

  it('should get recent changelog with default limit', async () => {
    await service.getRecentChangelog('bill-1');

    expect(mockPrisma.billChangelog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { billId: 'bill-1' },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }));
  });

  it('should get recent changelog with custom limit', async () => {
    await service.getRecentChangelog('bill-1', 5);

    expect(mockPrisma.billChangelog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 5,
    }));
  });
});
