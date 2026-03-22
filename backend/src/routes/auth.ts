import { FastifyPluginAsync } from 'fastify';
import { signupSchema, loginSchema, SignupInput, LoginInput } from '../schemas/auth';
import { normalizeIdentifier, detectIdentifierType } from '../utils/validation';
import { Prisma } from '@prisma/client';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { findClaimablePlaceholders, claimPlaceholderParticipants } from '../services/claimingService';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Signup
  fastify.post<{ Body: SignupInput }>(
    '/signup',
    {
      schema: {
        body: zodToJsonSchema(signupSchema.shape.body),
        response: {
          201: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              message: { type: 'string' },
              claimedPlaceholders: {
                type: 'object',
                nullable: true,
                properties: {
                  count: { type: 'number' },
                  totalBills: { type: 'number' },
                  totalExpenses: { type: 'number' },
                  totalSettlements: { type: 'number' },
                  bills: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        billId: { type: 'string' },
                        billName: { type: 'string' },
                        billOwnerName: { type: 'string' },
                        participantSince: { type: 'string' },
                        expenseCount: { type: 'number' },
                        settlementCount: { type: 'number' },
                        currentBalance: { type: 'number' },
                        lastActivity: { type: 'string', nullable: true },
                      },
                    },
                  },
                  financialSummary: {
                    type: 'object',
                    properties: {
                      totalPaid: { type: 'number' },
                      totalOwed: { type: 'number' },
                      netBalance: { type: 'number' },
                      activeDebts: { type: 'number' },
                      settledBills: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Validate request body with Zod (including custom validations)
      const validationResult = signupSchema.shape.body.safeParse(request.body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues[0]?.message || 'Validation failed';
        throw fastify.httpErrors.badRequest(errorMessage);
      }

      const { fullName, password, identifiers } = validationResult.data;

      // Hash password
      const passwordHash = await fastify.hashPassword(password);

      try {
        // Create user and identifiers in a transaction
        const result = await fastify.prisma.$transaction(async (tx) => {
          // Check if any identifier already exists
          for (const identifier of identifiers) {
            const normalizedValue = normalizeIdentifier(identifier.type, identifier.value);
            const existing = await tx.identifier.findUnique({
              where: { value: normalizedValue },
            });
            if (existing) {
              throw fastify.httpErrors.conflict(
                `Identifier ${identifier.value} is already registered`
              );
            }
          }

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

          // Check if there are claimable placeholder participants first
          const potentialClaims = [];
          for (const identifier of identifiers) {
            const normalizedValue = normalizeIdentifier(identifier.type, identifier.value);
            const existingParticipantIdentifier = await tx.participantIdentifier.findUnique({
              where: { value: normalizedValue },
            });
            
            if (existingParticipantIdentifier) {
              const participant = await tx.participant.findUnique({
                where: { id: existingParticipantIdentifier.participantId },
              });
              if (participant) {
                potentialClaims.push(participant);
              }
            }
          }

          let participant;
          if (potentialClaims.length > 0) {
            // Use the first claimable placeholder as the user's participant
            participant = potentialClaims[0];
            // Update the participant's display name to match the user
            await tx.participant.update({
              where: { id: participant.id },
              data: { displayName: fullName },
            });

            // Merge additional placeholder participants if there are multiple
            if (potentialClaims.length > 1) {
              for (let i = 1; i < potentialClaims.length; i++) {
                const additionalParticipant = potentialClaims[i];
                
                // Transfer all bill memberships to the primary participant
                await tx.billMember.updateMany({
                  where: { participantId: additionalParticipant.id },
                  data: { participantId: participant.id },
                });
                
                // Transfer all expenses (as payer)
                await tx.expense.updateMany({
                  where: { payerParticipantId: additionalParticipant.id },
                  data: { payerParticipantId: participant.id },
                });
                
                // Transfer all expense splits
                await tx.expenseSplit.updateMany({
                  where: { participantId: additionalParticipant.id },
                  data: { participantId: participant.id },
                });
                
                // Transfer all settlements
                await tx.settlement.updateMany({
                  where: { fromParticipantId: additionalParticipant.id },
                  data: { fromParticipantId: participant.id },
                });
                await tx.settlement.updateMany({
                  where: { toParticipantId: additionalParticipant.id },
                  data: { toParticipantId: participant.id },
                });
                
                // Delete the additional participant's identifiers and participant
                await tx.participantIdentifier.deleteMany({
                  where: { participantId: additionalParticipant.id },
                });
                await tx.participant.delete({
                  where: { id: additionalParticipant.id },
                });
              }
            }
          } else {
            // No claimable placeholders, create a new participant
            participant = await tx.participant.create({
              data: {
                displayName: fullName,
              },
            });

            // Create participant identifiers for the new participant
            await tx.participantIdentifier.createMany({
              data: identifiers.map(id => ({
                participantId: participant.id,
                type: id.type,
                value: normalizeIdentifier(id.type, id.value),
              })),
            });
          }

          // Link user to participant
          await tx.userParticipantLink.create({
            data: {
              userId: newUser.id,
              participantId: participant.id,
            },
          });

          return { user: newUser, claimedCount: potentialClaims.length };
        });

        const user = result.user;
        const claimedCount = result.claimedCount;

        // Get the user's participant to check for claiming results
        const userParticipantLink = await fastify.prisma.userParticipantLink.findUnique({
          where: { userId: user.id },
        });

        let claimingResult = null;
        if (userParticipantLink) {
          // Check if this participant was claimed from placeholders by finding bills
          const billMemberships = await fastify.prisma.billMember.findMany({
            where: { participantId: userParticipantLink.participantId },
          });

          if (billMemberships.length > 0) {
            // Get bill details and owner names separately
            const billDetails = [];
            for (const membership of billMemberships) {
              const bill = await fastify.prisma.bill.findUnique({
                where: { id: membership.billId },
              });
              const owner = await fastify.prisma.user.findUnique({
                where: { id: bill!.ownerUserId },
                select: { fullName: true },
              });
              
              billDetails.push({
                bill: bill!,
                owner: owner!,
                membership,
              });
            }

            // Calculate financial information for each bill
            const billData = [];
            let totalExpenses = 0;
            let totalSettlements = 0;
            
            for (const bd of billDetails) {
              // Get all expenses where this participant is involved (as payer or split)
              const participantExpenses = await fastify.prisma.expense.findMany({
                where: { 
                  billId: bd.bill.id,
                  payerParticipantId: userParticipantLink.participantId 
                },
              });
              
              const expenseSplits = await fastify.prisma.expenseSplit.findMany({
                where: { 
                  participantId: userParticipantLink.participantId,
                },
              });
              
              // Get the associated expenses separately
              const expenseIds = expenseSplits.map(s => s.expenseId);
              const associatedExpenses = await fastify.prisma.expense.findMany({
                where: { id: { in: expenseIds } }
              });
              
              // Get unique expense IDs (either as payer or as split participant)
              const expenseIdsAsPayer = new Set(participantExpenses.map(e => e.id));
              const billRelatedExpenses = associatedExpenses.filter(e => e.billId === bd.bill.id);
              const expenseIdsAsSplit = new Set(billRelatedExpenses.map(e => e.id));
              const allUniqueExpenseIds = new Set([...expenseIdsAsPayer, ...expenseIdsAsSplit]);
              
              const settlements = await fastify.prisma.settlement.findMany({
                where: { 
                  billId: bd.bill.id,
                  OR: [
                    { fromParticipantId: userParticipantLink.participantId },
                    { toParticipantId: userParticipantLink.participantId }
                  ]
                },
              });
              
              // Calculate balance (amount paid - amount owed + settlements)
              const amountPaid = participantExpenses.reduce((sum, exp) => sum + (exp.amountCents || 0), 0);
              const billExpenseSplits = expenseSplits.filter(s => 
                billRelatedExpenses.some(e => e.id === s.expenseId)
              );
              const amountOwed = billExpenseSplits.reduce((sum, split) => sum + (split.amountCents || 0), 0);
              const settlementBalance = settlements.reduce((sum, settlement) => {
                const settlementAmount = settlement.amountCents || 0;
                return settlement.fromParticipantId === userParticipantLink.participantId 
                  ? sum - settlementAmount 
                  : sum + settlementAmount;
              }, 0);
              
              const currentBalance = (amountPaid || 0) - (amountOwed || 0) + (settlementBalance || 0);
              
              totalExpenses += allUniqueExpenseIds.size;
              totalSettlements += settlements.length;
              
              billData.push({
                billId: bd.bill.id,
                billName: bd.bill.name,
                billOwnerName: bd.owner.fullName,
                participantSince: bd.membership.createdAt.toISOString(),
                expenseCount: allUniqueExpenseIds.size,
                settlementCount: settlements.length || 0,
                currentBalance: currentBalance || 0,
                lastActivity: null, // TODO: Calculate from latest activity
              });
            }

            // This participant has bill memberships, so it was claimed from placeholders
            claimingResult = {
              claimedCount: claimedCount || 1,
              totalBills: billDetails.length,
              totalExpenses,
              totalSettlements,
              bills: billData,
              financialSummary: {
                totalPaid: billData.reduce((sum, bill) => sum + Math.max(0, bill.currentBalance || 0), 0),
                totalOwed: billData.reduce((sum, bill) => sum + Math.abs(Math.min(0, bill.currentBalance || 0)), 0),
                netBalance: billData.reduce((sum, bill) => sum + (bill.currentBalance || 0), 0),
                activeDebts: billData.filter(bill => (bill.currentBalance || 0) < 0).length,
                settledBills: billData.filter(bill => (bill.currentBalance || 0) === 0).length,
              },
            };
          }
        }

        // Create session token
        const token = await reply.jwtSign(
          { userId: user.id },
          { expiresIn: '7d' }
        );

        // Set cookie - configured for cross-domain (ngrok compatibility)
        reply.setCookie('fazopix_session', token, {
          httpOnly: true,
          secure: true, // Always secure for ngrok HTTPS
          sameSite: 'none', // Allow cross-site requests
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
          // No domain specified = works across subdomains
        });

        const response: any = {
          userId: user.id,
          message: 'User created successfully',
        };

        // Add claiming information if any placeholders were claimed
        if (claimingResult && claimingResult.claimedCount > 0) {
          response.claimedPlaceholders = {
            count: claimingResult.claimedCount,
            totalBills: claimingResult.totalBills,
            totalExpenses: claimingResult.totalExpenses,
            totalSettlements: claimingResult.totalSettlements,
            bills: claimingResult.bills,
            financialSummary: claimingResult.financialSummary,
          };
        }

        return reply.status(201).send(response);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw fastify.httpErrors.conflict('User already exists');
          }
        }
        throw error;
      }
    }
  );

  // Login
  fastify.post<{ Body: LoginInput }>(
    '/login',
    {
      schema: {
        body: zodToJsonSchema(loginSchema.shape.body),
        response: {
          200: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { identifier, password } = request.body;

      // Try to detect identifier type
      const detectedType = detectIdentifierType(identifier);
      let normalizedValue = identifier;
      
      if (detectedType) {
        normalizedValue = normalizeIdentifier(detectedType, identifier);
      }

      // Find user by identifier
      const userIdentifier = await fastify.prisma.identifier.findFirst({
        where: {
          OR: [
            { value: normalizedValue },
            { value: identifier.toLowerCase() }, // Try lowercase for emails
            { value: identifier }, // Try original value
          ],
        },
      });

      if (!userIdentifier) {
        throw fastify.httpErrors.unauthorized('Invalid credentials');
      }

      // Get user separately since we removed the relation
      const user = await fastify.prisma.user.findUnique({
        where: { id: userIdentifier.userId }
      });

      if (!user) {
        throw fastify.httpErrors.unauthorized('Invalid credentials');
      }

      // Verify password
      const isValid = await fastify.verifyPassword(
        user.passwordHash,
        password
      );

      if (!isValid) {
        throw fastify.httpErrors.unauthorized('Invalid credentials');
      }

      // Create session token
      const token = await reply.jwtSign(
        { userId: user.id },
        { expiresIn: '7d' }
      );

      // Set cookie - configured for cross-domain (ngrok compatibility)
      reply.setCookie('fazopix_session', token, {
        httpOnly: true,
        secure: true, // Always secure for ngrok HTTPS
        sameSite: 'none', // Allow cross-site requests
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
        // No domain specified = works across subdomains
      });

      return {
        userId: user.id,
        message: 'Login successful',
      };
    }
  );

  // Logout
  fastify.post(
    '/logout',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      reply.clearCookie('fazopix_session');
      return { message: 'Logout successful' };
    }
  );

  // Get current user
  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user!.id }
      });

      if (!user) {
        throw fastify.httpErrors.notFound('User not found');
      }

      // Get identifiers separately since we removed the relation
      const identifiers = await fastify.prisma.identifier.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          type: true,
          value: true,
        }
      });

      return {
        id: user.id,
        fullName: user.fullName,
        identifiers: identifiers,
        createdAt: user.createdAt,
      };
    }
  );

  // TEMPORARY: Participants search route (should be moved to participants.ts)
  fastify.get('/participants-search', async (request, reply) => {
    const pixKey = request.query.pixKey as string;
    
    if (!pixKey) {
      return reply.status(400).send({ error: 'pixKey query parameter is required' });
    }

    try {
      // Search in participant_identifiers table for the PIX key
      const participantIdentifiers = await fastify.prisma.participantIdentifier.findMany({
        where: {
          value: {
            contains: pixKey,
            mode: 'insensitive'
          }
        },
        take: 10 // Limit results
      });

      if (participantIdentifiers.length === 0) {
        return reply.send([]);
      }

      // Get participant details for found identifiers
      const participantIds = participantIdentifiers.map(pi => pi.participantId);
      const participants = await fastify.prisma.participant.findMany({
        where: {
          id: {
            in: participantIds
          }
        }
      });

      // Combine participant data with their PIX keys
      const results = participants.map(participant => {
        const identifier = participantIdentifiers.find(pi => pi.participantId === participant.id);
        return {
          id: participant.id,
          displayName: participant.displayName,
          pixKey: identifier?.value || '',
          type: identifier?.type || 'UNKNOWN'
        };
      });

      return reply.send(results);
    } catch (error) {
      fastify.log.error('Error searching participants:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

export default authRoutes;