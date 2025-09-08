import { FastifyPluginAsync } from 'fastify';
import { signupSchema, loginSchema, SignupInput, LoginInput } from '../schemas/auth';
import { normalizeIdentifier, detectIdentifierType } from '../utils/validation';
import { Prisma } from '@prisma/client';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Signup
  fastify.post<{ Body: SignupInput }>(
    '/signup',
    {
      schema: {
        body: signupSchema.shape.body,
        response: {
          201: {
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
      const { fullName, password, identifiers } = request.body;

      // Hash password
      const passwordHash = await fastify.hashPassword(password);

      try {
        // Create user and identifiers in a transaction
        const user = await fastify.prisma.$transaction(async (tx) => {
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

          // Check for placeholder participants to claim
          const identifierValues = identifiers.map(id => 
            normalizeIdentifier(id.type, id.value)
          );
          
          const placeholderIdentifiers = await tx.participantIdentifier.findMany({
            where: {
              value: { in: identifierValues },
              participant: {
                userLink: null, // Not yet claimed
              },
            },
            include: {
              participant: true,
            },
          });

          // Claim placeholder participants
          for (const placeholder of placeholderIdentifiers) {
            await tx.userParticipantLink.create({
              data: {
                userId: newUser.id,
                participantId: placeholder.participantId,
              },
            });
          }

          return newUser;
        });

        // Create session token
        const token = await reply.jwtSign(
          { userId: user.id },
          { expiresIn: '7d' }
        );

        // Set cookie
        reply.setCookie('fazopix_session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

        return reply.status(201).send({
          userId: user.id,
          message: 'User created successfully',
        });
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
        body: loginSchema.shape.body,
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
        include: {
          user: true,
        },
      });

      if (!userIdentifier) {
        throw fastify.httpErrors.unauthorized('Invalid credentials');
      }

      // Verify password
      const isValid = await fastify.verifyPassword(
        userIdentifier.user.passwordHash,
        password
      );

      if (!isValid) {
        throw fastify.httpErrors.unauthorized('Invalid credentials');
      }

      // Create session token
      const token = await reply.jwtSign(
        { userId: userIdentifier.user.id },
        { expiresIn: '7d' }
      );

      // Set cookie
      reply.setCookie('fazopix_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      return {
        userId: userIdentifier.user.id,
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
        where: { id: request.user!.id },
        include: {
          identifiers: {
            select: {
              id: true,
              type: true,
              value: true,
            },
          },
        },
      });

      if (!user) {
        throw fastify.httpErrors.notFound('User not found');
      }

      return {
        id: user.id,
        fullName: user.fullName,
        identifiers: user.identifiers,
        createdAt: user.createdAt,
      };
    }
  );
};

export default authRoutes;