import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { authPlugin } from './plugins/auth';
import { prismaPlugin } from './plugins/prisma';
import { errorHandlerPlugin } from './plugins/errorHandler';
import { websocketPlugin } from './plugins/websocket';
import authRoutes from './routes/auth';
import billRoutes from './routes/bills';
import participantRoutes from './routes/participants';
import healthRoutes from './routes/health';
import { zodToJsonSchema } from 'zod-to-json-schema';

export async function build() {
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
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning', 'Accept', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'dev_cookie_secret_min_32_characters_long',
  });

  // Skip rate limiting in test environment
  if (process.env.NODE_ENV !== 'test') {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });
  }

  await app.register(sensible);

  // Swagger documentation (skip in test)
  if (process.env.NODE_ENV !== 'test') {
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
  }

  // Custom plugins
  await app.register(prismaPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  
  // Skip websocket in test
  if (process.env.NODE_ENV !== 'test') {
    await app.register(websocketPlugin);
  }

  // Add request ID to response headers
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(billRoutes, { prefix: '/api/bills' });
  console.log('🚀 Registering participants routes...')
  await app.register(participantRoutes, { prefix: '/api/participants' });
  
  // Health check routes
  await app.register(healthRoutes);

  return app;
}