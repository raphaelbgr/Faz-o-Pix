import { FastifyInstance, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
  };
  version: string;
  uptime: number;
}

interface ServiceCheck {
  name: string;
  status: 'connected' | 'disconnected';
  responseTime: number;
  error?: string;
}

export default async function healthRoutes(fastify: FastifyInstance) {
  // Comprehensive health check endpoint
  fastify.get('/health', async (request, reply: FastifyReply) => {
    const startTime = Date.now();

    // Check database connection
    const databaseCheck = await checkDatabaseConnection(fastify.prisma);

    const databaseStatus = databaseCheck.status === 'connected'
      ? 'connected' as const
      : 'disconnected' as const;

    const isHealthy = databaseStatus === 'connected';

    const healthStatus: HealthStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseStatus
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    };

    reply.code(isHealthy ? 200 : 503);
    reply.header('X-Response-Time', `${Date.now() - startTime}ms`);

    fastify.log.debug({
      healthCheck: healthStatus,
      responseTime: Date.now() - startTime,
      requestId: request.id
    }, 'Health check performed');

    return healthStatus;
  });

  // Detailed health check with service diagnostics
  fastify.get('/health/detailed', async (_request, reply: FastifyReply) => {
    const startTime = Date.now();

    const databaseCheck = await checkDatabaseConnection(fastify.prisma);
    const services: ServiceCheck[] = [databaseCheck];
    const isHealthy = services.every(service => service.status === 'connected');

    const detailedHealth = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    };

    reply.code(isHealthy ? 200 : 503);
    reply.header('X-Response-Time', `${Date.now() - startTime}ms`);

    return detailedHealth;
  });

  // Readiness probe
  fastify.get('/health/ready', async (_request, reply: FastifyReply) => {
    return reply.code(200).send({ ready: true, timestamp: new Date().toISOString() });
  });

  // Liveness probe
  fastify.get('/health/live', async (_request, reply: FastifyReply) => {
    return reply.code(200).send({ alive: true, timestamp: new Date().toISOString() });
  });
}

async function checkDatabaseConnection(prisma: PrismaClient): Promise<ServiceCheck> {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1 as test`;

    return {
      name: 'database',
      status: 'connected',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'disconnected',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}
