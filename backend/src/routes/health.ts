import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { HealthStatus, ServiceCheck } from '../../../shared/types/common';

export default async function healthRoutes(fastify: FastifyInstance) {
  // Comprehensive health check endpoint
  fastify.get('/health', {
    schema: {
      description: 'Comprehensive health check for all application services',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string', enum: ['connected', 'disconnected'] },
              }
            },
            version: { type: 'string' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    // Check database connection
    const databaseCheck = await checkDatabaseConnection(fastify.prisma);

    // Determine overall health status
    const databaseStatus = databaseCheck.status === 'connected' 
      ? 'connected' 
      : 'disconnected';

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

    // Set appropriate HTTP status code
    reply.code(isHealthy ? 200 : 503);
    
    // Add response time header
    reply.header('X-Response-Time', `${Date.now() - startTime}ms`);
    
    // Log health check result
    fastify.log.debug({
      healthCheck: healthStatus,
      responseTime: Date.now() - startTime,
      requestId: request.id
    }, 'Health check performed');

    return healthStatus;
  });

  // Detailed health check with service diagnostics
  fastify.get('/health/detailed', {
    schema: {
      description: 'Detailed health check with service diagnostics',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: { type: 'array' },
            system: { type: 'object' },
            version: { type: 'string' },
            uptime: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    // Check database with detailed diagnostics
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

  // Readiness probe (for Kubernetes/Docker health checks)
  fastify.get('/health/ready', {
    schema: {
      description: 'Readiness probe for container orchestration',
      tags: ['Health']
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Quick check - just verify the service is running
    return reply.code(200).send({ ready: true, timestamp: new Date().toISOString() });
  });

  // Liveness probe (for Kubernetes/Docker health checks)
  fastify.get('/health/live', {
    schema: {
      description: 'Liveness probe for container orchestration',
      tags: ['Health']
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ alive: true, timestamp: new Date().toISOString() });
  });
}

/**
 * Check database connectivity with timeout and detailed diagnostics
 */
async function checkDatabaseConnection(prisma: PrismaClient): Promise<ServiceCheck> {
  const startTime = Date.now();
  
  try {
    // Test database connectivity with a simple query
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

