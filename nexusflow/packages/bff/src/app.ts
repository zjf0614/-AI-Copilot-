// Fastify BFF application — API Gateway

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { config } from './config.js';
import { proxyTo } from './proxy/service-proxy.js';
import { requestLogger } from './middleware/request-logger.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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

  // Global plugins
  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  });

  // Static files for dev console
  const __dirname = dirname(fileURLToPath(import.meta.url));
  await app.register(fastifyStatic, {
    root: resolve(__dirname, '..', 'public'),
    prefix: '/',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'NexusFlow API',
        version: '1.0.0',
        description: 'NexusFlow — AI-Native Enterprise Collaboration Platform',
      },
      servers: [{ url: `http://localhost:${config.PORT}` }],
    },
  });

  await app.register(swaggerUI, { routePrefix: '/docs' });

  // Request logging
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Request-Id', request.id as string);
  });

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

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'nexusflow-bff',
    timestamp: new Date().toISOString(),
  }));

  // ─── Route Proxies ───────────────────────────────

  // Auth service proxy
  app.all('/api/v1/auth/*', async (request, reply) => proxyTo('auth', request, reply));

  // Org service proxy
  const orgPrefixes = ['/api/v1/workspaces', '/api/v1/guests', '/api/v1/share-links'];
  for (const prefix of orgPrefixes) {
    app.all(`${prefix}/*`, async (request, reply) => {
      const path = request.url;
      // Determine service from path
      const chatSegments = ['/channels', '/dms', '/search', '/archive', '/calls', '/messages/', '/read-receipts', '/references'];
      const projectSegments = ['/projects', '/sprints', '/time-entries', '/tasks/'];
      const docSegments = ['/docs', '/templates', '/docs-search'];
      const workflowSegments = ['/workflows'];
      const notifySegments = ['/notifications', '/notification-prefs', '/integrations', '/webhooks'];
      const aiSegments = ['/ai/', '/knowledge-bases'];
      const analyticsSegments = ['/dashboards', '/okrs', '/events', '/insights'];
      if (chatSegments.some(s => path.includes(s))) return proxyTo('chat', request, reply);
      if (projectSegments.some(s => path.includes(s))) return proxyTo('project', request, reply);
      if (docSegments.some(s => path.includes(s))) return proxyTo('doc', request, reply);
      if (workflowSegments.some(s => path.includes(s))) return proxyTo('workflow', request, reply);
      if (notifySegments.some(s => path.includes(s))) return proxyTo('notify', request, reply);
      if (aiSegments.some(s => path.includes(s))) return proxyTo('ai', request, reply);
      if (analyticsSegments.some(s => path.includes(s))) return proxyTo('analytics', request, reply);
      return proxyTo('org', request, reply);
    });
    app.all(prefix, async (request, reply) => proxyTo('org', request, reply));
  }

  // Catch-all
  app.all('/api/v1/*', async (request, reply) => {
    const path = request.url;
    if (path.startsWith('/api/v1/auth')) return proxyTo('auth', request, reply);
    return proxyTo('org', request, reply);
  });

  return app;
}
