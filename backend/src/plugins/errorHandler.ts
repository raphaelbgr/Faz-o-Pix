import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    const { statusCode = 500 } = error;
    
    // Log error
    if (statusCode >= 500) {
      fastify.log.error({
        err: error,
        request: {
          method: request.method,
          url: request.url,
          params: request.params,
          query: request.query,
        },
      }, 'Server error');
    } else {
      fastify.log.info({
        err: error,
        request: {
          method: request.method,
          url: request.url,
        },
      }, 'Client error');
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    // Handle Prisma errors
    if (error.code === 'P2002') {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'A record with this value already exists',
      });
    }

    if (error.code === 'P2025') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    }

    // Default error response
    const message = statusCode < 500 
      ? error.message 
      : 'An unexpected error occurred';

    return reply.status(statusCode).send({
      error: error.name || 'Error',
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    });
  });
};

export default fp(errorHandlerPlugin, {
  name: 'errorHandler',
});

export { errorHandlerPlugin };