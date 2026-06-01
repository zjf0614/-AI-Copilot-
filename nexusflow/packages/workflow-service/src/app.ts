import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { AppError } from '@nexusflow/shared';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export async function buildApp() {
  const app = Fastify({ logger: { level: config.LOG_LEVEL, transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined }, genReqId: () => crypto.randomUUID() });
  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute', keyGenerator: (req) => req.ip });

  // Auth middleware
  const authenticate = async (request: any, _reply: any) => {
    const h = request.headers.authorization;
    if (!h) throw new AppError('UNAUTHORIZED' as any, 'Authentication required', 401);
    const [_, token] = h.split(' ');
    try { request.user = jwt.verify(token, config.JWT_PUBLIC_KEY, { algorithms: ['RS256'], issuer: config.JWT_ISSUER }); }
    catch { throw new AppError('UNAUTHORIZED' as any, 'Invalid token', 401); }
  };

  app.setErrorHandler((error: any, _request: any, reply: any) => {
    if (error instanceof AppError) return reply.status(error.statusCode).send(error.toJSON());
    if (error.statusCode === 429) return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: config.NODE_ENV === 'development' ? error.message : 'Internal server error' } });
  });

  // Workflow routes
  const a = [authenticate];
  const { workflowService } = await import('./services/workflow.service.js');

  app.post('/api/v1/workspaces/:wid/workflows', { preHandler: a }, async (req, reply) => {
    const wf = await workflowService.create((req.params as any).wid, req.body as any);
    return reply.code(201).send({ success: true, data: wf });
  });
  app.get('/api/v1/workspaces/:wid/workflows', { preHandler: a }, async (req, reply) => {
    const result = await workflowService.list((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });
  app.get('/api/v1/workspaces/:wid/workflows/:wfid', { preHandler: a }, async (req, reply) => {
    const wf = await workflowService.getById((req.params as any).wfid);
    return reply.send({ success: true, data: wf });
  });
  app.patch('/api/v1/workspaces/:wid/workflows/:wfid', { preHandler: a }, async (req, reply) => {
    const wf = await workflowService.update((req.params as any).wfid, req.body as any);
    return reply.send({ success: true, data: wf });
  });
  app.delete('/api/v1/workspaces/:wid/workflows/:wfid', { preHandler: a }, async (req, reply) => {
    await workflowService.delete((req.params as any).wfid);
    return reply.send({ success: true, data: { message: 'Workflow deleted' } });
  });
  app.post('/api/v1/workspaces/:wid/workflows/:wfid/publish', { preHandler: a }, async (req, reply) => {
    await workflowService.publish((req.params as any).wfid);
    return reply.send({ success: true, data: { message: 'Workflow published' } });
  });
  app.post('/api/v1/workspaces/:wid/workflows/:wfid/execute', { preHandler: a }, async (req, reply) => {
    const exec = await workflowService.execute((req.params as any).wfid, (req.body as any)?.triggerData);
    return reply.code(201).send({ success: true, data: exec });
  });
  app.get('/api/v1/workspaces/:wid/workflows/:wfid/executions', { preHandler: a }, async (req, reply) => {
    const executions = await workflowService.listExecutions((req.params as any).wfid);
    return reply.send({ success: true, data: executions });
  });

  app.get('/health', async () => ({ status: 'ok', service: 'workflow-service', timestamp: new Date().toISOString() }));
  return app;
}
