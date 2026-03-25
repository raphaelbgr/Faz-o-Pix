import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import jwt from '@fastify/jwt';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    hashPassword: (password: string) => Promise<string>;
    verifyPassword: (hash: string, password: string) => Promise<boolean>;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    appUser?: User;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_123456',
    cookie: {
      cookieName: 'fazopix_session',
      signed: false,
    },
  });

  fastify.decorate('hashPassword', async (password: string) => {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  });

  fastify.decorate('verifyPassword', async (hash: string, password: string) => {
    return argon2.verify(hash, password);
  });

  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();

      const payload = request.user as Record<string, unknown>;
      const userId = payload.userId as string | undefined;
      if (!userId) {
        throw new Error('Invalid token payload');
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      request.appUser = user;
    } catch (err) {
      throw fastify.httpErrors.unauthorized('Authentication required');
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
});

export { authPlugin };