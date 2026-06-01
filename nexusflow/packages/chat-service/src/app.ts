import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { AppError } from '@nexusflow/shared';
import crypto from 'node:crypto';

// Route imports
import { channelRoutes } from './routes/channel.routes.js';
import { messageRoutes } from './routes/message.routes.js';
import { threadRoutes } from './routes/thread.routes.js';
import { reactionRoutes } from './routes/reaction.routes.js';
import { dmRoutes } from './routes/dm.routes.js';
import { readReceiptRoutes } from './routes/read-receipt.routes.js';
import { searchRoutes } from './routes/search.routes.js';
import { archiveRoutes } from './routes/archive.routes.js';
import { callRoutes } from './routes/call.routes.js';
import { referenceRoutes } from './routes/reference.routes.js';
import { wsGateway } from './websocket/gateway.js';

export async function buildApp() {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL, transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined },
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute', keyGenerator: (req) => req.ip });
  await app.register(swagger, { openapi: { info: { title: 'NexusFlow Chat Service', version: '1.0.0' } } });
  await app.register(swaggerUI, { routePrefix: '/docs' });
  await app.register(websocket);

  app.setErrorHandler((error: any, request, reply) => {
    if (error instanceof AppError) return reply.status(error.statusCode).send(error.toJSON());
    if (error.validation) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.validation } });
    if (error.statusCode === 429) return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    request.log.error(error);
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: config.NODE_ENV === 'development' ? error.message : 'Internal server error' } });
  });

  // REST routes
  await app.register(channelRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(messageRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(threadRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(reactionRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(dmRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(readReceiptRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(searchRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(archiveRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(callRoutes, { prefix: '/api/v1/workspaces' });
  await app.register(referenceRoutes, { prefix: '/api/v1/workspaces' });

  // WebSocket endpoint
  app.get('/ws', { websocket: true }, wsGateway);

  app.get('/health', async () => ({ status: 'ok', service: 'chat-service', timestamp: new Date().toISOString() }));
  return app;
}
