import { FastifyPluginAsync } from 'fastify';
import { 
  createBillSchema, 
  addMemberSchema, 
  addExpenseSchema,
  recordSettlementSchema,
  getBillSchema,
  getBalancesSchema,
  CreateBillInput,
  AddMemberInput,
  AddExpenseInput,
  RecordSettlementInput,
} from '../schemas/bills';
import { normalizeIdentifier } from '../utils/validation';
import { ShareType } from '@prisma/client';
import { calculateBalances, simplifyDebts } from '../services/balanceCalculator';
import { ChangelogService } from '../services/changelogService';
import { generatePixBRCode } from '../utils/pixPayment';

const billRoutes: FastifyPluginAsync = async (fastify) => {
  const changelogService = new ChangelogService(fastify, fastify.prisma);
  // Create bill
  fastify.post<{ Body: CreateBillInput }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: createBillSchema.shape.body,
      },
    },
    async (request, reply) => {
      const { name, description, simplifyDebts } = request.body;
      const userId = request.appUser!.id;

      const bill = await fastify.prisma.$transaction(async (tx) => {
        // Get user's participant
        const userParticipant = await tx.userParticipantLink.findUnique({
          where: { userId },
        });

        if (!userParticipant) {
          throw fastify.httpErrors.internalServerError('User participant not found');
        }

        // Create bill
        const newBill = await tx.bill.create({
          data: {
            name,
            description,
            simplifyDebts,
            ownerUserId: userId,
          },
        });

        // Add owner as first member
        await tx.billMember.create({
          data: {
            billId: newBill.id,
            participantId: userParticipant.participantId,
            role: 'OWNER',
          },
        });

        return newBill;
      });

      return reply.status(201).send(bill);
    }
  );

  // Get user's bills
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      const userId = request.appUser!.id;

      // Get user's participant
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId },
      });

      if (!userParticipant) {
        return [];
      }

      const bills = await fastify.prisma.bill.findMany({
        where: {
          OR: [
            { ownerUserId: userId },
            {
              members: {
                some: {
                  participantId: userParticipant.participantId,
                },
              },
            },
          ],
        },
        include: {
          _count: {
            select: {
              members: true,
              expenses: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return bills;
    }
  );

  // Add member to bill
  fastify.post<{ Params: { id: string }; Body: AddMemberInput }>(
    '/:id/members',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: addMemberSchema.shape.params,
        body: addMemberSchema.shape.body,
      },
    },
    async (request, reply) => {
      const { id: billId } = request.params;
      const { identifierType, identifierValue, displayName } = request.body;

      // Check if user is bill owner
      const bill = await fastify.prisma.bill.findFirst({
        where: {
          id: billId,
          ownerUserId: request.appUser!.id,
        },
      });

      if (!bill) {
        throw fastify.httpErrors.forbidden('Only bill owner can add members');
      }

      const normalizedValue = normalizeIdentifier(identifierType, identifierValue);

      const member = await fastify.prisma.$transaction(async (tx) => {
        // Check if participant already exists with this identifier
        let participant = await tx.participantIdentifier.findUnique({
          where: { value: normalizedValue },
          include: { participant: true },
        });

        if (!participant) {
          // Create placeholder participant
          const newParticipant = await tx.participant.create({
            data: {
              displayName: displayName || identifierValue,
            },
          });

          // Add identifier to participant
          await tx.participantIdentifier.create({
            data: {
              participantId: newParticipant.id,
              type: identifierType,
              value: normalizedValue,
            },
          });

          participant = await tx.participantIdentifier.findUnique({
            where: { value: normalizedValue },
            include: { participant: true },
          });
        }

        // Check if already a member
        const existingMember = await tx.billMember.findUnique({
          where: {
            billId_participantId: {
              billId,
              participantId: participant!.participant.id,
            },
          },
        });

        if (existingMember) {
          throw fastify.httpErrors.conflict('Participant is already a member of this bill');
        }

        // Add as member
        const newMember = await tx.billMember.create({
          data: {
            billId,
            participantId: participant!.participant.id,
            role: 'MEMBER',
          },
          include: {
            participant: {
              include: {
                identifiers: true,
                userLink: true,
              },
            },
          },
        });

        return newMember;
      });

      // Log member addition
      await changelogService.logMemberAdded(
        billId, 
        request.appUser!.id, 
        member.participant.displayName || identifierValue
      );

      return reply.status(201).send(member);
    }
  );

  // Add expense
  fastify.post<{ Params: { id: string }; Body: AddExpenseInput }>(
    '/:id/expenses',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: addExpenseSchema.shape.params,
        body: addExpenseSchema.shape.body,
      },
    },
    async (request, reply) => {
      const { id: billId } = request.params;
      const { payerParticipantId, amountCents, description, spentAt, splits } = request.body;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Only bill members can add expenses');
      }

      const expense = await fastify.prisma.$transaction(async (tx) => {
        // Verify all participants in splits are bill members
        const participantIds = [...new Set(splits.map(s => s.participantId))];
        const members = await tx.billMember.findMany({
          where: {
            billId,
            participantId: { in: participantIds },
          },
        });

        if (members.length !== participantIds.length) {
          throw fastify.httpErrors.badRequest('All split participants must be bill members');
        }

        // Verify payer is a bill member
        const payerMember = await tx.billMember.findFirst({
          where: {
            billId,
            participantId: payerParticipantId,
          },
        });

        if (!payerMember) {
          throw fastify.httpErrors.badRequest('Payer must be a bill member');
        }

        // Create expense
        const newExpense = await tx.expense.create({
          data: {
            billId,
            payerParticipantId,
            amountCents,
            description,
            spentAt,
          },
        });

        // Calculate split amounts
        const splitData = calculateSplitAmounts(amountCents, splits);

        // Create splits
        await tx.expenseSplit.createMany({
          data: splitData.map(split => ({
            expenseId: newExpense.id,
            participantId: split.participantId,
            shareType: split.shareType,
            shareValue: split.shareValue,
            amountCents: split.amountCents,
          })),
        });

        return tx.expense.findUnique({
          where: { id: newExpense.id },
          include: {
            payer: true,
            splits: {
              include: {
                participant: true,
              },
            },
          },
        });
      });

      // Log expense addition
      await changelogService.logExpenseAdded(
        billId,
        request.appUser!.id,
        expense!.id,
        expense!.description || 'Sem descrição',
        expense!.amountCents
      );

      return reply.status(201).send(expense);
    }
  );

  // Get bill with expenses
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: getBillSchema.shape.params,
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Only bill members can view bill details');
      }

      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
        include: {
          members: {
            include: {
              participant: {
                include: {
                  identifiers: true,
                  userLink: true,
                },
              },
            },
          },
          expenses: {
            include: {
              payer: true,
              splits: {
                include: {
                  participant: true,
                },
              },
            },
            orderBy: {
              spentAt: 'desc',
            },
          },
          settlements: {
            include: {
              fromParticipant: true,
              toParticipant: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!bill) {
        throw fastify.httpErrors.notFound('Bill not found');
      }

      return bill;
    }
  );

  // Get balances
  fastify.get<{ Params: { id: string } }>(
    '/:id/balances',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: getBalancesSchema.shape.params,
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Only bill members can view balances');
      }

      // Get bill with expenses and settlements
      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
        include: {
          members: {
            include: {
              participant: true,
            },
          },
          expenses: {
            include: {
              splits: true,
            },
          },
          settlements: true,
        },
      });

      if (!bill) {
        throw fastify.httpErrors.notFound('Bill not found');
      }

      // Calculate balances
      const rawBalances = calculateBalances(bill);
      
      // Optionally simplify debts
      const simplifiedBalances = bill.simplifyDebts 
        ? simplifyDebts(rawBalances)
        : null;

      return {
        raw: rawBalances,
        simplified: simplifiedBalances,
        simplifyEnabled: bill.simplifyDebts,
      };
    }
  );

  // Record settlement
  fastify.post<{ Params: { id: string }; Body: RecordSettlementInput }>(
    '/:id/settlements',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: recordSettlementSchema.shape.params,
        body: recordSettlementSchema.shape.body,
      },
    },
    async (request, reply) => {
      const { id: billId } = request.params;
      const { fromParticipantId, toParticipantId, amountCents, method, reference, note } = request.body;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Only bill members can record settlements');
      }

      const settlement = await fastify.prisma.$transaction(async (tx) => {
        // Verify both participants are bill members
        const fromMember = await tx.billMember.findFirst({
          where: {
            billId,
            participantId: fromParticipantId,
          },
        });

        const toMember = await tx.billMember.findFirst({
          where: {
            billId,
            participantId: toParticipantId,
          },
        });

        if (!fromMember || !toMember) {
          throw fastify.httpErrors.badRequest('Both participants must be bill members');
        }

        // Create settlement
        return tx.settlement.create({
          data: {
            billId,
            fromParticipantId,
            toParticipantId,
            amountCents,
            method,
            reference,
            note,
          },
          include: {
            fromParticipant: true,
            toParticipant: true,
          },
        });
      });

      // Log settlement
      await changelogService.logSettlementAdded(
        billId,
        request.appUser!.id,
        settlement.id,
        settlement.fromParticipant.displayName || 'Participante',
        settlement.toParticipant.displayName || 'Participante',
        settlement.amountCents
      );

      return reply.status(201).send(settlement);
    }
  );

  // Get expenses list
  fastify.get<{ Params: { id: string } }>(
    '/:id/expenses',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: getBillSchema.shape.params,
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Somente membros podem ver despesas');
      }

      const expenses = await fastify.prisma.expense.findMany({
        where: { billId },
        include: {
          payer: true,
          splits: {
            include: {
              participant: true,
            },
          },
        },
        orderBy: { spentAt: 'desc' },
      });

      const totalAmountCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);
      const myTotalPaid = expenses
        .filter(e => e.payerParticipantId === userParticipant.participantId)
        .reduce((sum, e) => sum + e.amountCents, 0);
      const myTotalOwed = expenses.reduce((sum, e) => {
        const mySplit = e.splits.find(s => s.participantId === userParticipant.participantId);
        return sum + (mySplit?.amountCents || 0);
      }, 0);

      return {
        expenses,
        totalAmountCents,
        myTotalPaid,
        myTotalOwed,
      };
    }
  );

  // Get single expense
  fastify.get<{ Params: { id: string; expenseId: string } }>(
    '/:id/expenses/:expenseId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      const { id: billId, expenseId } = request.params;

      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Somente membros podem ver despesas');
      }

      const expense = await fastify.prisma.expense.findFirst({
        where: { id: expenseId, billId },
        include: {
          payer: true,
          splits: {
            include: {
              participant: true,
            },
          },
        },
      });

      if (!expense) {
        throw fastify.httpErrors.notFound('Despesa não encontrada');
      }

      return expense;
    }
  );

  // Update expense
  fastify.put<{ Params: { id: string; expenseId: string }; Body: AddExpenseInput }>(
    '/:id/expenses/:expenseId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: addExpenseSchema.shape.body,
      },
    },
    async (request, reply) => {
      const { id: billId, expenseId } = request.params;
      const { payerParticipantId, amountCents, description, spentAt, splits } = request.body;

      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const existingExpense = await fastify.prisma.expense.findFirst({
        where: { id: expenseId, billId },
      });

      if (!existingExpense) {
        throw fastify.httpErrors.notFound('Despesa não encontrada');
      }

      // Check 24-hour edit window
      const hoursSinceCreation = (Date.now() - existingExpense.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        throw fastify.httpErrors.forbidden('Despesas só podem ser editadas nas primeiras 24 horas');
      }

      const updated = await fastify.prisma.$transaction(async (tx) => {
        // Verify all split participants are bill members
        const participantIds = [...new Set(splits.map(s => s.participantId))];
        const members = await tx.billMember.findMany({
          where: {
            billId,
            participantId: { in: participantIds },
          },
        });

        if (members.length !== participantIds.length) {
          throw fastify.httpErrors.badRequest('Todos os participantes do rateio devem ser membros');
        }

        // Delete old splits
        await tx.expenseSplit.deleteMany({
          where: { expenseId },
        });

        // Update expense
        await tx.expense.update({
          where: { id: expenseId },
          data: {
            payerParticipantId,
            amountCents,
            description,
            spentAt,
          },
        });

        // Calculate and create new splits
        const splitData = calculateSplitAmounts(amountCents, splits);
        await tx.expenseSplit.createMany({
          data: splitData.map(split => ({
            expenseId,
            participantId: split.participantId,
            shareType: split.shareType,
            shareValue: split.shareValue,
            amountCents: split.amountCents,
          })),
        });

        return tx.expense.findUnique({
          where: { id: expenseId },
          include: {
            payer: true,
            splits: {
              include: {
                participant: true,
              },
            },
          },
        });
      });

      await changelogService.logExpenseUpdated(
        billId,
        request.appUser!.id,
        expenseId,
        updated!.description || 'Sem descrição',
        { amountCents, description }
      );

      return reply.send(updated);
    }
  );

  // Delete expense
  fastify.delete<{ Params: { id: string; expenseId: string } }>(
    '/:id/expenses/:expenseId',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id: billId, expenseId } = request.params;

      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const expense = await fastify.prisma.expense.findFirst({
        where: { id: expenseId, billId },
      });

      if (!expense) {
        throw fastify.httpErrors.notFound('Despesa não encontrada');
      }

      // Check 24-hour delete window
      const hoursSinceCreation = (Date.now() - expense.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        throw fastify.httpErrors.forbidden('Despesas só podem ser removidas nas primeiras 24 horas');
      }

      await fastify.prisma.expense.delete({
        where: { id: expenseId },
      });

      await changelogService.logExpenseDeleted(
        billId,
        request.appUser!.id,
        expense.description || 'Sem descrição'
      );

      return reply.status(204).send();
    }
  );

  // Get settlements list
  fastify.get<{ Params: { id: string } }>(
    '/:id/settlements',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: getBillSchema.shape.params,
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Somente membros podem ver pagamentos');
      }

      const settlements = await fastify.prisma.settlement.findMany({
        where: { billId },
        include: {
          fromParticipant: true,
          toParticipant: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalAmountCents = settlements.reduce((sum, s) => sum + s.amountCents, 0);
      const byMethod: Record<string, number> = {};
      for (const s of settlements) {
        byMethod[s.method] = (byMethod[s.method] || 0) + s.amountCents;
      }

      return {
        settlements,
        totalCount: settlements.length,
        summary: {
          totalAmountCents,
          byMethod,
        },
      };
    }
  );

  // Get changelog
  fastify.get<{ Params: { id: string } }>(
    '/:id/changelog',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: getBillSchema.shape.params,
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Only bill members can view changelog');
      }

      return changelogService.getRecentChangelog(billId);
    }
  );

  // Generate Pix BR Code for a payment
  fastify.post<{
    Params: { id: string };
    Body: {
      fromParticipantId: string;
      toParticipantId: string;
      amountCents: number;
    };
  }>(
    '/:id/pix-code',
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      const { id: billId } = request.params;
      const { fromParticipantId, toParticipantId, amountCents } = request.body;

      // Verify user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.appUser!.id },
      });

      if (!userParticipant) {
        throw fastify.httpErrors.forbidden('User participant not found');
      }

      const member = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      });

      if (!member) {
        throw fastify.httpErrors.forbidden('Somente membros podem gerar códigos Pix');
      }

      // Get the recipient's Pix key
      const toParticipant = await fastify.prisma.participant.findUnique({
        where: { id: toParticipantId },
        include: {
          identifiers: {
            where: {
              type: { in: ['PIX_CPF', 'PIX_CNPJ', 'PIX_EMAIL', 'PIX_PHONE', 'PIX_EVP'] },
            },
            take: 1,
          },
        },
      });

      if (!toParticipant) {
        throw fastify.httpErrors.notFound('Participante destinatário não encontrado');
      }

      const pixIdentifier = toParticipant.identifiers[0];
      if (!pixIdentifier) {
        return {
          brCode: null,
          message: 'Destinatário não possui chave Pix cadastrada',
        };
      }

      const fromParticipant = await fastify.prisma.participant.findUnique({
        where: { id: fromParticipantId },
      });

      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
      });

      const brCode = generatePixBRCode({
        pixKey: pixIdentifier.value,
        merchantName: toParticipant.displayName || 'PARTICIPANTE',
        amountCents,
        description: `Faz-o-Pix: ${bill?.name || 'Pagamento'}`,
        txId: `FOP${billId.substring(0, 8)}`,
      });

      return {
        brCode,
        pixKey: pixIdentifier.value,
        pixKeyType: pixIdentifier.type,
        from: fromParticipant?.displayName || 'Participante',
        to: toParticipant.displayName || 'Participante',
        amountCents,
      };
    }
  );
};

// Helper function to calculate split amounts
function calculateSplitAmounts(
  totalCents: number,
  splits: Array<{
    shareType: ShareType;
    participantId: string;
    shareValue?: number;
  }>
): Array<{
  participantId: string;
  shareType: ShareType;
  shareValue: number;
  amountCents: number;
}> {
  const result = [];
  let remainingCents = totalCents;
  
  if (splits[0]?.shareType === ShareType.EQUAL) {
    // Equal split
    const equalParticipants = splits.filter(s => s.shareType === ShareType.EQUAL);
    const amountPerPerson = Math.floor(totalCents / equalParticipants.length);
    const remainder = totalCents % equalParticipants.length;
    
    for (let i = 0; i < equalParticipants.length; i++) {
      const amount = i < remainder ? amountPerPerson + 1 : amountPerPerson;
      result.push({
        participantId: equalParticipants[i]!.participantId,
        shareType: ShareType.EQUAL,
        shareValue: 1,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
  } else if (splits[0]?.shareType === ShareType.PERCENT) {
    // Percentage split
    for (const split of splits) {
      const amount = Math.round((totalCents * (split.shareValue || 0)) / 100);
      result.push({
        participantId: split.participantId,
        shareType: ShareType.PERCENT,
        shareValue: split.shareValue || 0,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
    
    // Adjust for rounding errors
    if (remainingCents !== 0 && result.length > 0) {
      result[0]!.amountCents += remainingCents;
    }
  } else if (splits[0]?.shareType === ShareType.SHARES) {
    // Shares split
    const totalShares = splits.reduce((sum, s) => sum + (s.shareValue || 0), 0);
    
    for (const split of splits) {
      const amount = Math.round((totalCents * (split.shareValue || 0)) / totalShares);
      result.push({
        participantId: split.participantId,
        shareType: ShareType.SHARES,
        shareValue: split.shareValue || 0,
        amountCents: amount,
      });
      remainingCents -= amount;
    }
    
    // Adjust for rounding errors
    if (remainingCents !== 0 && result.length > 0) {
      result[0]!.amountCents += remainingCents;
    }
  }
  
  return result;
}

export default billRoutes;