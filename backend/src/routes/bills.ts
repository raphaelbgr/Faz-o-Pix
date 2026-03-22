import { FastifyPluginAsync } from 'fastify';
import { 
  createBillSchema, 
  addMemberSchema, 
  addExpenseSchema,
  recordSettlementSchema,
  getBillSchema,
  getBillMembersSchema,
  removeMemberSchema,
  getBalancesSchema,
  updateBillSchema,
  deleteBillSchema,
  listBillsSchema,
  CreateBillInput,
  AddMemberInput,
  AddExpenseInput,
  RecordSettlementInput,
  UpdateBillInput,
  ListBillsQuery,
} from '../schemas/bills';
import { 
  createExpenseSchema,
  validateExpenseBusinessRules,
  CreateExpenseBody,
  CreateExpenseParams
} from '../schemas/expenses';
import { createExpense } from '../services/expenseService';
import { DeleteService } from '../services/deleteService';
import { normalizeIdentifier, maskIdentifier, generateDisplayName } from '../utils/validation';
import { ShareType } from '@prisma/client';
import { calculateBalances, simplifyDebts } from '../services/balanceCalculator';
import { ChangelogService } from '../services/changelogService';
import { zodToJsonSchema } from 'zod-to-json-schema';

const billRoutes: FastifyPluginAsync = async (fastify) => {
  const changelogService = new ChangelogService(fastify, fastify.prisma);
  const deleteService = new DeleteService(fastify.prisma);
  // Create bill
  fastify.post<{ Body: CreateBillInput }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: zodToJsonSchema(createBillSchema.shape.body),
      },
    },
    async (request, reply) => {
      const { name, description } = request.body;
      const userId = request.user!.id;

      // Validate name length (3-100 characters)
      const trimmedName = name.trim();
      if (trimmedName.length < 3) {
        throw fastify.httpErrors.badRequest('Nome da conta deve ter pelo menos 3 caracteres');
      }
      if (trimmedName.length > 100) {
        throw fastify.httpErrors.badRequest('Nome da conta deve ter no máximo 100 caracteres');
      }

      // Check for duplicate bill name
      const existingBill = await fastify.prisma.bill.findFirst({
        where: {
          ownerUserId: userId,
          name: trimmedName,
          isArchived: false,
        },
      });

      if (existingBill) {
        throw fastify.httpErrors.conflict('Você já tem uma conta com este nome');
      }

      const bill = await fastify.prisma.$transaction(async (tx) => {
        // Get user details
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw fastify.httpErrors.unauthorized('User not found');
        }

        // Get or create user's participant
        let userParticipant = await tx.userParticipantLink.findUnique({
          where: { userId },
        });

        if (!userParticipant) {
          // Create a participant record for the user if it doesn't exist
          const participant = await tx.participant.create({
            data: {
              displayName: user.fullName,
            },
          });

          userParticipant = await tx.userParticipantLink.create({
            data: {
              userId,
              participantId: participant.id,
            },
          });
        }

        // Create bill
        const newBill = await tx.bill.create({
          data: {
            name: trimmedName,
            description,
            // Debt simplification is always enabled for better UX
            simplifyDebts: true,
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

      return reply.status(201).send({
        success: true,
        data: {
          id: bill.id,
          name: bill.name,
          description: bill.description,
          simplify_debts: bill.simplifyDebts,
          owner_id: bill.ownerUserId,
          created_at: bill.createdAt.toISOString(),
          participant_count: 1,
          total_expenses: 0,
          my_balance: 0,
        },
      });
    }
  );

  // Get user's bills
  fastify.get<{ Querystring: ListBillsQuery }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: zodToJsonSchema(listBillsSchema.shape.query),
      },
    },
    async (request) => {
      const userId = request.user!.id;
      const { include_archived, sort, order } = request.query;

      // Get user's participant (optional for owned bills)
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId },
      });

      // First get bills where user is owner
      const ownedBills = await fastify.prisma.bill.findMany({
        where: {
          ownerUserId: userId,
          ...(include_archived ? {} : { isArchived: false }),
        },
      });

      // Then get bills where user is a member (only if user has participant link)
      const memberships = userParticipant ? await fastify.prisma.billMember.findMany({
        where: {
          participantId: userParticipant.participantId,
        },
      }) : [];

      const memberBillIds = memberships
        .map(m => m.billId)
        .filter(billId => !ownedBills.some(b => b.id === billId)); // Exclude owned bills

      const memberBills = memberBillIds.length > 0 ? await fastify.prisma.bill.findMany({
        where: {
          id: { in: memberBillIds },
          ...(include_archived ? {} : { isArchived: false }),
        },
      }) : [];

      // Combine all bills
      const bills = [...ownedBills, ...memberBills];

      // For each bill, get expenses, settlements, and member counts separately
      const billsWithData = await Promise.all(bills.map(async (bill) => {
        // Get member count
        const memberCount = await fastify.prisma.billMember.count({
          where: { billId: bill.id }
        });

        // Get expense count
        const expenseCount = await fastify.prisma.expense.count({
          where: { billId: bill.id }
        });

        // Get all expenses for this bill
        const expenses = await fastify.prisma.expense.findMany({
          where: { billId: bill.id }
        });

        // Get expense splits for current user in this bill (only if user has participant link)
        const expenseIds = expenses.map(e => e.id);
        const expenseSplits = userParticipant && expenseIds.length > 0 ? await fastify.prisma.expenseSplit.findMany({
          where: {
            participantId: userParticipant.participantId,
            expenseId: { in: expenseIds }
          }
        }) : [];

        // Get settlements for current user (only if user has participant link)
        const settlements = userParticipant ? await fastify.prisma.settlement.findMany({
          where: {
            billId: bill.id,
            OR: [
              { fromParticipantId: userParticipant.participantId },
              { toParticipantId: userParticipant.participantId },
            ],
          }
        }) : [];

        return {
          ...bill,
          _count: {
            members: memberCount,
            expenses: expenseCount,
          },
          expenses,
          expenseSplits,
          settlements,
        };
      }));

      // Calculate balances and format bills
      const formattedBills = billsWithData.map((bill) => {
        // Calculate my balance: what I paid - what I owe + settlement adjustments
        let totalPaid = 0;
        let totalOwed = 0;
        let settlementBalance = 0;

        // Calculate what I paid (from expenses where I'm the payer)
        bill.expenses.forEach((expense) => {
          if (expense.payerParticipantId === userParticipant.participantId) {
            totalPaid += expense.amountCents;
          }
        });

        // Calculate what I owe from splits
        bill.expenseSplits.forEach((split) => {
          totalOwed += split.amountCents;
        });

        // Calculate settlement adjustments
        bill.settlements.forEach((settlement) => {
          if (settlement.fromParticipantId === userParticipant.participantId) {
            settlementBalance -= settlement.amountCents; // I paid someone
          } else if (settlement.toParticipantId === userParticipant.participantId) {
            settlementBalance += settlement.amountCents; // Someone paid me
          }
        });

        const myBalance = totalPaid - totalOwed + settlementBalance;

        // Calculate total expenses for the bill
        const totalExpenses = bill.expenses.reduce((sum, exp) => sum + exp.amountCents, 0);

        // Get last activity from expenses or bill updates
        const expenseUpdates = bill.expenses.map((exp) => exp.createdAt);
        const settlementUpdates = bill.settlements.map((set) => set.createdAt);
        const allUpdates = [bill.updatedAt, ...expenseUpdates, ...settlementUpdates];
        const lastActivity = allUpdates.length > 1 ? new Date(Math.max(...allUpdates.map(d => d.getTime()))) : bill.updatedAt;

        return {
          id: bill.id,
          name: bill.name,
          description: bill.description,
          simplify_debts: bill.simplifyDebts,
          owner_id: bill.ownerUserId,
          is_owner: bill.ownerUserId === userId,
          created_at: bill.createdAt.toISOString(),
          last_activity: lastActivity.toISOString(),
          participant_count: bill._count.members,
          total_expenses: totalExpenses,
          my_balance: myBalance,
          is_archived: bill.isArchived,
          role: bill.ownerUserId === userId ? 'owner' as const : 'participant' as const,
        };
      });

      // Sort bills
      const sortedBills = formattedBills.sort((a, b) => {
        let comparison = 0;
        switch (sort) {
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'last_activity':
            comparison = new Date(a.last_activity).getTime() - new Date(b.last_activity).getTime();
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name, 'pt-BR');
            break;
          case 'balance':
            comparison = Math.abs(a.my_balance) - Math.abs(b.my_balance);
            break;
        }
        return order === 'desc' ? -comparison : comparison;
      });

      // Calculate summary
      const ownedBillsList = formattedBills.filter((b) => b.is_owner);
      const participatingBills = formattedBills.filter((b) => !b.is_owner);
      const archivedBills = formattedBills.filter((b) => b.is_archived);
      const totalBalance = formattedBills.reduce((sum, b) => sum + b.my_balance, 0);

      return {
        success: true,
        data: {
          bills: sortedBills,
          summary: {
            total_bills: formattedBills.length,
            owned_bills: ownedBillsList.length,
            participating_bills: participatingBills.length,
            total_balance: totalBalance,
            archived_bills: archivedBills.length,
          },
        },
      };
    }
  );

  // Add member to bill
  fastify.post<{ Params: { id: string }; Body: AddMemberInput }>(
    '/:id/members',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(addMemberSchema.shape.params),
        body: zodToJsonSchema(addMemberSchema.shape.body),
      },
    },
    async (request, reply) => {
      const { id: billId } = request.params;
      const { identifierType, identifierValue, displayName } = request.body;

      // Check if user is bill owner
      const bill = await fastify.prisma.bill.findFirst({
        where: {
          id: billId,
          ownerUserId: request.user!.id,
        },
      });

      if (!bill) {
        throw fastify.httpErrors.forbidden('Apenas o dono da conta pode adicionar participantes');
      }

      const normalizedValue = normalizeIdentifier(identifierType, identifierValue);

      // Check for existing user with this identifier
      const existingUserIdentifier = await fastify.prisma.identifier.findUnique({
        where: { value: normalizedValue },
      });

      // Get user and participant link separately if identifier exists
      let user = null;
      let userParticipantLink = null;
      if (existingUserIdentifier) {
        user = await fastify.prisma.user.findUnique({ where: { id: existingUserIdentifier.userId } });
        if (user) {
          userParticipantLink = await fastify.prisma.userParticipantLink.findUnique({ where: { userId: user.id } });
        }
      }

      const result = await fastify.prisma.$transaction(async (tx) => {
        let participantId: string;
        let isPlaceholder = false;
        let userName: string | null = null;
        let userId: string | null = null;

        if (user && userParticipantLink) {
          // User exists - link to existing participant
          participantId = userParticipantLink.participantId;
          userName = user.fullName;
          userId = user.id;
          isPlaceholder = false;
        } else {
          // Check if participant already exists as placeholder
          let existingParticipantIdentifier = await tx.participantIdentifier.findUnique({
            where: { value: normalizedValue },
          });

          let existingParticipant = null;
          if (existingParticipantIdentifier) {
            existingParticipant = await tx.participant.findUnique({
              where: { id: existingParticipantIdentifier.participantId }
            });
          }

          if (existingParticipantIdentifier && existingParticipant) {
            participantId = existingParticipant.id;
            isPlaceholder = true;
          } else {
            // Create new placeholder participant
            const newParticipant = await tx.participant.create({
              data: {
                displayName: displayName || generateDisplayName(identifierValue, identifierType),
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

            participantId = newParticipant.id;
            isPlaceholder = true;
          }
        }

        // Check if already a member of this bill
        const existingMember = await tx.billMember.findUnique({
          where: {
            billId_participantId: {
              billId,
              participantId,
            },
          },
        });

        if (existingMember) {
          throw fastify.httpErrors.conflict('Esta pessoa já participa desta conta');
        }

        // Add as member
        const newMember = await tx.billMember.create({
          data: {
            billId,
            participantId,
            role: 'MEMBER',
          },
        });

        // Get final participant details
        const participant = await tx.participant.findUnique({
          where: { id: participantId },
        });

        // Get participant identifiers and user link separately
        const participantIdentifiers = await tx.participantIdentifier.findMany({
          where: { participantId },
        });

        const participantUserLink = await tx.userParticipantLink.findUnique({
          where: { participantId },
        });

        let participantUser = null;
        if (participantUserLink) {
          participantUser = await tx.user.findUnique({
            where: { id: participantUserLink.userId },
          });
        }

        return {
          newMember,
          participant,
          participantIdentifiers,
          participantUserLink,
          participantUser,
          isPlaceholder,
          userName,
          userId,
        };
      });

      // Get the primary identifier for masking
      const primaryIdentifier = result.participantIdentifiers.find(
        (id) => id.value === normalizedValue
      );

      const finalDisplayName = result.isPlaceholder 
        ? result.participant!.displayName || generateDisplayName(identifierValue, identifierType)
        : result.userName || result.participant!.displayName || 'Participante';

      const maskedIdentifier = primaryIdentifier 
        ? maskIdentifier(identifierValue, primaryIdentifier.type)
        : maskIdentifier(identifierValue, identifierType);

      // Log member addition
      await changelogService.logMemberAdded(
        billId, 
        request.user!.id, 
        finalDisplayName
      );

      // Return formatted response according to Story 2.2 spec
      return reply.status(201).send({
        success: true,
        data: {
          participant_id: result.participant!.id,
          user_id: result.userId,
          is_placeholder: result.isPlaceholder,
          display_name: finalDisplayName,
          identifier_type: identifierType,
          masked_identifier: maskedIdentifier,
          joined_at: result.newMember.createdAt.toISOString(),
          role: 'member',
          can_remove: true, // New participants can initially be removed
        },
      });
    }
  );

  // Get bill members
  fastify.get<{ Params: { id: string } }>(
    '/:id/members',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(getBillMembersSchema.shape.params),
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.user!.id },
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
        throw fastify.httpErrors.forbidden('Apenas membros da conta podem ver participantes');
      }

      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        throw fastify.httpErrors.notFound('Conta não encontrada');
      }

      // Get all bill members
      const billMembers = await fastify.prisma.billMember.findMany({
        where: { billId },
        orderBy: { createdAt: 'asc' },
      });

      // Get participant details for each member
      const members = await Promise.all(billMembers.map(async (member) => {
        const participant = await fastify.prisma.participant.findUnique({
          where: { id: member.participantId },
        });

        if (!participant) return null;

        // Get participant identifiers
        const identifiers = await fastify.prisma.participantIdentifier.findMany({
          where: { participantId: participant.id },
        });

        // Get user link if exists
        const userLink = await fastify.prisma.userParticipantLink.findUnique({
          where: { participantId: participant.id },
        });

        let user = null;
        if (userLink) {
          user = await fastify.prisma.user.findUnique({
            where: { id: userLink.userId },
          });
        }

        const isLinkedUser = !!user;
        const isPlaceholder = !isLinkedUser;
        
        // Get primary identifier for masking
        const primaryIdentifier = identifiers[0];
        const identifierType = primaryIdentifier?.type;
        const maskedIdentifier = primaryIdentifier 
          ? maskIdentifier(primaryIdentifier.value, primaryIdentifier.type)
          : 'Identificação não disponível';

        // Count expenses and settlements
        const paidExpensesCount = await fastify.prisma.expense.count({
          where: {
            billId,
            payerParticipantId: participant.id,
          },
        });

        // Get all expenses for this bill first
        const billExpenseIds = await fastify.prisma.expense.findMany({
          where: { billId },
          select: { id: true },
        });

        const expenseSplitsCount = billExpenseIds.length > 0 ? await fastify.prisma.expenseSplit.count({
          where: {
            participantId: participant.id,
            expenseId: { in: billExpenseIds.map(e => e.id) },
          },
        }) : 0;

        const settlementsFromCount = await fastify.prisma.settlement.count({
          where: {
            billId,
            fromParticipantId: participant.id,
          },
        });

        const settlementsToCount = await fastify.prisma.settlement.count({
          where: {
            billId,
            toParticipantId: participant.id,
          },
        });

        // Calculate current balance for this participant
        let currentBalance = 0; // Placeholder - would need actual balance calculation

        // Display name logic
        let displayName: string;
        if (isLinkedUser) {
          displayName = user!.fullName;
        } else {
          displayName = participant.displayName || (primaryIdentifier 
            ? generateDisplayName(primaryIdentifier.value, primaryIdentifier.type) 
            : 'Participante');
        }

        // Check if participant can be removed
        const canRemove = member.role !== 'OWNER' && 
          (paidExpensesCount + expenseSplitsCount) === 0 &&
          (settlementsFromCount + settlementsToCount) === 0;

        // Check if current user can edit this participant
        const canEdit = bill.ownerUserId === request.user!.id;

        // Last activity calculation (simplified)
        const lastActivity = new Date().toISOString(); // Placeholder

        return {
          participant_id: participant.id,
          user_id: isLinkedUser ? user!.id : null,
          is_placeholder: isPlaceholder,
          display_name: displayName,
          identifier_type: identifierType || 'unknown',
          masked_identifier: maskedIdentifier,
          role: member.role.toLowerCase() as 'owner' | 'member',
          joined_at: member.createdAt.toISOString(),
          last_activity: lastActivity,
          expense_count: paidExpensesCount + expenseSplitsCount,
          settlement_count: settlementsFromCount + settlementsToCount,
          current_balance: currentBalance,
          can_remove: canRemove,
          can_edit: canEdit,
        };
      }));

      // Filter out any null members
      const validMembers = members.filter(m => m !== null) as any[];

      // Calculate summary statistics
      const registeredMembers = validMembers.filter(m => !m.is_placeholder).length;
      const placeholderMembers = validMembers.filter(m => m.is_placeholder).length;
      const activeMembers = validMembers.filter(m => m.expense_count > 0 || m.settlement_count > 0).length;

      return {
        success: true,
        data: {
          members: validMembers,
          summary: {
            total_members: validMembers.length,
            registered_members: registeredMembers,
            placeholder_members: placeholderMembers,
            active_members: activeMembers,
          },
        },
      };
    }
  );

  // Remove member from bill
  fastify.delete<{ Params: { id: string; participantId: string } }>(
    '/:id/members/:participantId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(removeMemberSchema.shape.params),
      },
    },
    async (request, reply) => {
      const { id: billId, participantId } = request.params;
      const currentUserId = request.user!.id;

      // Check if bill exists and user owns it
      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        throw fastify.httpErrors.notFound('Conta não encontrada');
      }

      if (bill.ownerUserId !== currentUserId) {
        throw fastify.httpErrors.forbidden('Apenas o dono da conta pode remover participantes');
      }

      // Get the member to be removed
      const memberToRemove = await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId,
        },
      });

      let participant = null;
      let participantUser = null;
      if (memberToRemove) {
        participant = await fastify.prisma.participant.findUnique({
          where: { id: participantId },
        });

        if (participant) {
          const userLink = await fastify.prisma.userParticipantLink.findUnique({
            where: { participantId },
          });
          if (userLink) {
            participantUser = await fastify.prisma.user.findUnique({
              where: { id: userLink.userId },
            });
          }
        }
      }

      if (!memberToRemove) {
        throw fastify.httpErrors.notFound('Participante não encontrado nesta conta');
      }

      // Cannot remove the owner
      if (memberToRemove.role === 'OWNER') {
        throw fastify.httpErrors.conflict('Não é possível remover o dono da conta');
      }

      // Check if participant has expense history
      const expenseCount = await fastify.prisma.expense.count({
        where: {
          billId,
          OR: [
            { payerParticipantId: participantId },
            { splits: { some: { participantId } } },
          ],
        },
      });

      if (expenseCount > 0) {
        const settlementCount = await fastify.prisma.settlement.count({
          where: {
            billId,
            OR: [
              { fromParticipantId: participantId },
              { toParticipantId: participantId },
            ],
          },
        });

        throw fastify.httpErrors.conflict('Não é possível remover participante com histórico de despesas', {
          details: {
            expense_count: expenseCount,
            settlement_count: settlementCount,
            suggestion: 'Liquide todas as dívidas antes de remover'
          }
        });
      }

      // Check if participant has settlements
      const settlementCount = await fastify.prisma.settlement.count({
        where: {
          billId,
          OR: [
            { fromParticipantId: participantId },
            { toParticipantId: participantId },
          ],
        },
      });

      if (settlementCount > 0) {
        throw fastify.httpErrors.conflict('Não é possível remover participante com histórico de pagamentos');
      }

      // Remove the member
      await fastify.prisma.billMember.delete({
        where: {
          billId_participantId: {
            billId,
            participantId,
          },
        },
      });

      // Get display name for logging
      const displayName = participantUser?.fullName || 
                          participant?.displayName || 
                          'Participante';

      // Log member removal
      await changelogService.logMemberAdded( // We don't have a logMemberRemoved method, using generic
        billId,
        currentUserId,
        `Removido: ${displayName}`
      );

      return reply.status(200).send({
        success: true,
        data: {
          message: 'Participante removido da conta',
          participant_name: displayName,
          removed_at: new Date().toISOString(),
        },
      });
    }
  );

  // Add expense with flexible splits
  fastify.post<{ Params: CreateExpenseParams; Body: CreateExpenseBody }>(
    '/:id/expenses',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(createExpenseSchema.shape.params),
        body: zodToJsonSchema(createExpenseSchema.shape.body),
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  expenseId: { type: 'string' },
                  totalAmount: { type: 'number' },
                  splits: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        participantId: { type: 'string' },
                        participantName: { type: 'string' },
                        amountCents: { type: 'number' },
                        percentage: { type: 'number', nullable: true },
                        shares: { type: 'number', nullable: true }
                      }
                    }
                  },
                  balanceImpact: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        participantId: { type: 'string' },
                        participantName: { type: 'string' },
                        balanceChange: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
    },
    async (request, reply) => {
      const { id: billId } = request.params;
      const requestBody = request.body;

      // Comprehensive input validation
      const validationResult = createExpenseSchema.safeParse({ 
        params: { id: billId }, 
        body: requestBody 
      });
      
      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0];
        throw fastify.httpErrors.badRequest(firstError?.message || 'Dados da despesa inválidos');
      }

      // Business rule validation
      const businessRuleValidation = validateExpenseBusinessRules.safeParse({ 
        body: requestBody 
      });

      if (!businessRuleValidation.success) {
        throw fastify.httpErrors.badRequest('O pagador deve estar incluído na divisão da despesa');
      }

      try {
        const result = await createExpense(
          fastify.prisma,
          {
            billId,
            payerParticipantId: requestBody.payerParticipantId,
            amountCents: requestBody.amountCents,
            description: requestBody.description,
            spentAt: new Date(requestBody.spentAt),
            splitType: requestBody.splitType,
            splits: requestBody.splits
          },
          request.user!.id
        );

        return reply.status(201).send({
          success: true,
          data: result
        });

      } catch (error) {
        if (error instanceof Error) {
          // Handle specific business rule errors
          if (error.message.includes('permission')) {
            throw fastify.httpErrors.forbidden(error.message);
          }
          if (error.message.includes('must be') || error.message.includes('sum to')) {
            throw fastify.httpErrors.badRequest(error.message);
          }
          if (error.message.includes('calculation error')) {
            fastify.log.error('Split calculation error:', error);
            throw fastify.httpErrors.internalServerError('Erro no cálculo da divisão');
          }
        }
        throw error;
      }
    }
  );

  // Get bill with expenses
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(getBillSchema.shape.params),
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      // Check if user is bill owner first
      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        throw fastify.httpErrors.notFound('Bill not found');
      }

      const userId = request.user!.id;
      const isOwner = bill.ownerUserId === userId;

      // Get user's participant link (optional)
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId },
      });

      // Check if user is member (only if they have participant link)
      const member = userParticipant ? await fastify.prisma.billMember.findFirst({
        where: {
          billId,
          participantId: userParticipant.participantId,
        },
      }) : null;

      // Allow access if user is owner OR member
      if (!isOwner && !member) {
        throw fastify.httpErrors.forbidden('Only bill owners or members can view bill details');
      }

      // Get members with participant data
      const billMembers = await fastify.prisma.billMember.findMany({
        where: { billId },
      });

      const members = await Promise.all(billMembers.map(async (member) => {
        const participant = await fastify.prisma.participant.findUnique({
          where: { id: member.participantId },
        });

        // Get user link if exists
        const userLink = await fastify.prisma.userParticipantLink.findUnique({
          where: { participantId: member.participantId },
        });

        let user = null;
        if (userLink) {
          user = await fastify.prisma.user.findUnique({
            where: { id: userLink.userId },
          });
        }

        return {
          ...member,
          participant: {
            ...participant,
            userLink: userLink ? { userId: user?.id } : null,
          },
        };
      }));

      // Get expenses with payer and splits data
      const expenseRecords = await fastify.prisma.expense.findMany({
        where: { billId },
        orderBy: { spentAt: 'desc' },
      });

      const expenses = await Promise.all(expenseRecords.map(async (expense) => {
        // Get payer participant data
        const payer = await fastify.prisma.participant.findUnique({
          where: { id: expense.payerParticipantId },
        });

        // Get expense splits with participant data
        const splitRecords = await fastify.prisma.expenseSplit.findMany({
          where: { expenseId: expense.id },
        });

        const splits = await Promise.all(splitRecords.map(async (split) => {
          const participant = await fastify.prisma.participant.findUnique({
            where: { id: split.participantId },
          });

          return {
            ...split,
            participant,
          };
        }));

        return {
          ...expense,
          payer,
          splits,
        };
      }));

      // Get settlements with participant data
      const settlementRecords = await fastify.prisma.settlement.findMany({
        where: { billId },
        orderBy: { createdAt: 'desc' },
      });

      const settlements = await Promise.all(settlementRecords.map(async (settlement) => {
        // Get from and to participant data
        const fromParticipant = await fastify.prisma.participant.findUnique({
          where: { id: settlement.fromParticipantId },
        });

        const toParticipant = await fastify.prisma.participant.findUnique({
          where: { id: settlement.toParticipantId },
        });

        return {
          ...settlement,
          fromParticipant,
          toParticipant,
        };
      }));

      return {
        ...bill,
        members,
        expenses,
        settlements,
      };
    }
  );

  // Get balances
  fastify.get<{ Params: { id: string } }>(
    '/:id/balances',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(getBalancesSchema.shape.params),
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.user!.id },
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

      // Get bill
      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        throw fastify.httpErrors.notFound('Bill not found');
      }

      // Get members
      const members = await fastify.prisma.billMember.findMany({
        where: { billId },
      });

      // Get participants for members
      const participants = await Promise.all(
        members.map(async (member) => {
          const participant = await fastify.prisma.participant.findUnique({
            where: { id: member.participantId },
          });
          return { ...member, participant };
        })
      );

      // Get expenses with splits
      const expenses = await fastify.prisma.expense.findMany({
        where: { billId },
      });

      const expensesWithSplits = await Promise.all(
        expenses.map(async (expense) => {
          const splits = await fastify.prisma.expenseSplit.findMany({
            where: { expenseId: expense.id },
          });
          return { ...expense, splits };
        })
      );

      // Get settlements
      const settlements = await fastify.prisma.settlement.findMany({
        where: { billId },
      });

      // Build bill object for balance calculation
      const billWithRelations = {
        ...bill,
        members: participants,
        expenses: expensesWithSplits,
        settlements,
      };

      // Calculate balances
      const rawBalances = calculateBalances(billWithRelations);
      
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
        params: zodToJsonSchema(recordSettlementSchema.shape.params),
        body: zodToJsonSchema(recordSettlementSchema.shape.body),
      },
    },
    async (request, reply) => {
      const { id: billId } = request.params;
      const { fromParticipantId, toParticipantId, amountCents, method, reference, note } = request.body;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.user!.id },
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
        const newSettlement = await tx.settlement.create({
          data: {
            billId,
            fromParticipantId,
            toParticipantId,
            amountCents,
            method,
            reference,
            note,
          },
        });

        // Get participant names for response
        const fromParticipant = await tx.participant.findUnique({
          where: { id: fromParticipantId },
        });
        const toParticipant = await tx.participant.findUnique({
          where: { id: toParticipantId },
        });

        return {
          ...newSettlement,
          fromParticipant,
          toParticipant,
        };
      });

      // Log settlement
      await changelogService.logSettlementAdded(
        billId,
        request.user!.id,
        settlement.id,
        settlement.fromParticipant?.displayName || 'Participante',
        settlement.toParticipant?.displayName || 'Participante',
        settlement.amountCents
      );

      return reply.status(201).send(settlement);
    }
  );

  // Get changelog
  fastify.get<{ Params: { id: string } }>(
    '/:id/changelog',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(getBillSchema.shape.params),
      },
    },
    async (request) => {
      const { id: billId } = request.params;

      // Check if user is bill member
      const userParticipant = await fastify.prisma.userParticipantLink.findUnique({
        where: { userId: request.user!.id },
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

  // Update bill settings
  fastify.put<{ Params: { id: string }; Body: UpdateBillInput }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(updateBillSchema.shape.params),
        body: zodToJsonSchema(updateBillSchema.shape.body),
      },
    },
    async (request, reply) => {
      const { id: billId } = request.params;
      const { name, description, simplifyDebts, isArchived } = request.body;
      const userId = request.user!.id;

      // Check if user is bill owner
      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        throw fastify.httpErrors.notFound('Conta não encontrada');
      }

      if (bill.ownerUserId !== userId) {
        throw fastify.httpErrors.forbidden('Apenas o dono da conta pode alterar configurações');
      }

      // Validate name if provided
      if (name !== undefined) {
        const trimmedName = name.trim();
        if (trimmedName.length < 3) {
          throw fastify.httpErrors.badRequest('Nome da conta deve ter pelo menos 3 caracteres');
        }
        if (trimmedName.length > 100) {
          throw fastify.httpErrors.badRequest('Nome da conta deve ter no máximo 100 caracteres');
        }

        // Check for duplicate name (excluding current bill)
        const existingBill = await fastify.prisma.bill.findFirst({
          where: {
            ownerUserId: userId,
            name: trimmedName,
            isArchived: false,
            id: { not: billId },
          },
        });

        if (existingBill) {
          throw fastify.httpErrors.conflict('Você já tem uma conta com este nome');
        }
      }

      // Validate description length if provided
      if (description !== undefined && description.length > 500) {
        throw fastify.httpErrors.badRequest('Descrição deve ter no máximo 500 caracteres');
      }

      // Update bill
      const updatedBill = await fastify.prisma.bill.update({
        where: { id: billId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description }),
          ...(simplifyDebts !== undefined && { simplifyDebts }),
          ...(isArchived !== undefined && { isArchived }),
        },
      });

      return reply.status(200).send({
        success: true,
        data: {
          id: updatedBill.id,
          name: updatedBill.name,
          description: updatedBill.description,
          simplify_debts: updatedBill.simplifyDebts,
          is_archived: updatedBill.isArchived,
          updated_at: updatedBill.updatedAt.toISOString(),
        },
      });
    }
  );

  // Delete bill
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: zodToJsonSchema(deleteBillSchema.shape.params),
      },
    },
    async (request, reply) => {
      const { id: billId } = request.params;
      const userId = request.user!.id;

      // Check if bill exists and user owns it
      const bill = await fastify.prisma.bill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        throw fastify.httpErrors.notFound('Conta não encontrada');
      }

      if (bill.ownerUserId !== userId) {
        throw fastify.httpErrors.forbidden('Apenas o dono da conta pode excluir a conta');
      }

      // Check if bill has expenses
      const expenseCount = await fastify.prisma.expense.count({
        where: { billId },
      });

      if (expenseCount > 0) {
        throw fastify.httpErrors.conflict(
          'Não é possível excluir conta com despesas'
        );
      }

      // Check if bill has settlements
      const settlementCount = await fastify.prisma.settlement.count({
        where: { billId },
      });

      if (settlementCount > 0) {
        throw fastify.httpErrors.conflict(
          'Não é possível excluir conta com histórico de pagamentos'
        );
      }

      // Delete bill (cascade will handle members)
      await fastify.prisma.bill.delete({
        where: { id: billId },
      });

      return reply.status(200).send({
        success: true,
        data: {
          message: 'Conta excluída com sucesso',
          deleted_at: new Date().toISOString(),
        },
      });
    }
  );
};


export default billRoutes;