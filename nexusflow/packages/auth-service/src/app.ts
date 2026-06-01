// Fastify application instance for auth-service

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { authRoutes } from './routes/auth.routes.js';
import { ssoRoutes } from './routes/sso.routes.js';
import { mfaRoutes } from './routes/mfa.routes.js';
import { config } from './config.js';
import { AppError } from '@nexusflow/shared';
import crypto from 'node:crypto';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
    genReqId: () => crypto.randomUUID(),
  });

  // Plugins
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (req) => req.ip,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'NexusFlow Auth Service',
        version: '1.0.0',
        description: 'Authentication and SSO service for NexusFlow',
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
  });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      });
    }

    // Log unexpected errors
    request.log.error(error);

    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: config.NODE_ENV === 'development' ? error.message : 'Internal server error',
      },
    });
  });

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(ssoRoutes, { prefix: '/api/v1/auth/sso' });
  await app.register(mfaRoutes, { prefix: '/api/v1/auth/mfa' });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  }));

  return app;
}
