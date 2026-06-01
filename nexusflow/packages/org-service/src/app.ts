// Fastify application instance for org-service

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { workspaceRoutes } from './routes/workspace.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { roleRoutes } from './routes/role.routes.js';
import { orgRoutes } from './routes/org.routes.js';
import { guestRoutes } from './routes/guest.routes.js';
import { policyRoutes } from './routes/policy.routes.js';
import { auditRoutes } from './routes/audit.routes.js';
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
  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute', keyGenerator: (req) => req.ip });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'NexusFlow Organization Service',
        version: '1.0.0',
        description: 'Organization, permissions, guests, policies, and audit for NexusFlow',
      },
    },
  });

  await app.register(swaggerUI, { routePrefix: '/docs' });

  // Global error handler
  app.setErrorHandler((error: any, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    if (error.validation) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.validation },
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: config.NODE_ENV === 'development' ? error.message : 'Internal server error' },
    });
  });

  // Routes
  await app.register(workspaceRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(userRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(roleRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(orgRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(guestRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(policyRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(auditRoutes, { prefix: '/api/v1/workspaces' });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'org-service',
    timestamp: new Date().toISOString(),
  }));

  return app;
}
