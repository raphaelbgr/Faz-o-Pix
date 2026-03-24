import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  });

  try {
    await prisma.$connect();
  } catch (err) {
    if (process.env.NODE_ENV === 'test') {
      fastify.log.warn('Database connection failed in test environment — DB-dependent routes will fail');
    } else {
      throw err;
    }
  }

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (fastify) => {
    await fastify.prisma.$disconnect();
  });
};

export default fp(prismaPlugin, {
  name: 'prisma',
});

export { prismaPlugin };