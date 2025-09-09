import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import { authPlugin } from './plugins/auth';
import { prismaPlugin } from './plugins/prisma';
import { errorHandlerPlugin } from './plugins/errorHandler';
import { websocketPlugin } from './plugins/websocket';
import authRoutes from './routes/auth';
import billRoutes from './routes/bills';
import healthRoutes from './routes/health';
import { zodToJsonSchema } from 'zod-to-json-schema';

const prisma = new PrismaClient();

async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: process.env.NODE_ENV !== 'production' 
        ? { target: 'pino-pretty' }
        : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: false, // We'll configure CSP per route as needed
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'dev_cookie_secret_min_32_characters_long',
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(sensible);

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Faz-o-Pix API',
        description: 'Brazilian bill splitting application API',
        version: '1.0.0',
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:3001',
        },
      ],
    },
    transform: zodToJsonSchema,
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Custom plugins
  await app.register(prismaPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  await app.register(websocketPlugin);

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(billRoutes, { prefix: '/api/bills' });
  
  // Health check routes
  await app.register(healthRoutes);

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log(`📚 API Docs available at http://${host}:${port}/docs`);
  } catch (err) {
    console.error('Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

start();