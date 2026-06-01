import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { config } from './config.js';
import { AppError } from '@nexusflow/shared';
import crypto from 'node:crypto';
import { projectRoutes } from './routes/project.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: config.LOG_LEVEL, transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined }, genReqId: () => crypto.randomUUID() });
  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute', keyGenerator: (req) => req.ip });
  await app.register(swagger, { openapi: { info: { title: 'NexusFlow Project Service', version: '1.0.0' } } });
  await app.register(swaggerUI, { routePrefix: '/docs' });
  app.setErrorHandler((error: any, request, reply) => {
    if (error instanceof AppError) return reply.status(error.statusCode).send(error.toJSON());
    if (error.validation) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.validation } });
    if (error.statusCode === 429) return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    request.log.error(error);
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: config.NODE_ENV === 'development' ? error.message : 'Internal server error' } });
  });
  await app.register(projectRoutes, { prefix: '/api/v1/workspaces' });
  app.get('/health', async () => ({ status: 'ok', service: 'project-service', timestamp: new Date().toISOString() }));
  return app;
}
