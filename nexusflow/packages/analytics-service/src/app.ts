import Fastify from 'fastify'; import cors from '@fastify/cors'; import rateLimit from '@fastify/rate-limit'; import { config } from './config.js'; import { AppError } from '@nexusflow/shared'; import crypto from 'node:crypto'; import jwt from 'jsonwebtoken'; import { analyticsService } from './services/analytics.service.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: config.LOG_LEVEL, transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined }, genReqId: () => crypto.randomUUID() });
  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute', keyGenerator: (req) => req.ip });

  const auth = async (request: any, _reply: any) => {
    const h = request.headers.authorization;
    if (!h) throw new AppError('UNAUTHORIZED' as any, 'Authentication required', 401);
    try { request.user = jwt.verify(h.split(' ')[1]!, config.JWT_PUBLIC_KEY, { algorithms: ['RS256'], issuer: config.JWT_ISSUER }); }
    catch { throw new AppError('UNAUTHORIZED' as any, 'Invalid token', 401); }
  };
  app.setErrorHandler((error: any, _req: any, reply: any) => {
    if (error instanceof AppError) return reply.status(error.statusCode).send(error.toJSON());
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  });
  const a = [auth];

  // Dashboards
  app.post('/api/v1/workspaces/:wid/dashboards', { preHandler: a }, async (req, reply) => {
    const d = await analyticsService.createDashboard((req.params as any).wid, (req as any).user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: d });
  });
  app.get('/api/v1/workspaces/:wid/dashboards', { preHandler: a }, async (req, reply) => {
    const dashboards = await analyticsService.listDashboards((req.params as any).wid);
    return reply.send({ success: true, data: dashboards });
  });
  app.get('/api/v1/workspaces/:wid/dashboards/:did', { preHandler: a }, async (req, reply) => {
    const d = await analyticsService.getDashboard((req.params as any).did);
    return reply.send({ success: true, data: d });
  });
  app.patch('/api/v1/workspaces/:wid/dashboards/:did', { preHandler: a }, async (req, reply) => {
    const d = await analyticsService.updateDashboard((req.params as any).did, req.body as any);
    return reply.send({ success: true, data: d });
  });
  app.delete('/api/v1/workspaces/:wid/dashboards/:did', { preHandler: a }, async (req, reply) => {
    await analyticsService.deleteDashboard((req.params as any).did);
    return reply.send({ success: true, data: { message: 'Dashboard deleted' } });
  });
  // OKRs
  app.post('/api/v1/workspaces/:wid/okrs', { preHandler: a }, async (req, reply) => {
    const obj = await analyticsService.createObjective((req.params as any).wid, (req as any).user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: obj });
  });
  app.get('/api/v1/workspaces/:wid/okrs', { preHandler: a }, async (req, reply) => {
    const { userId, quarter } = req.query as any;
    const okrs = await analyticsService.listObjectives((req.params as any).wid, userId, quarter);
    return reply.send({ success: true, data: okrs });
  });
  app.patch('/api/v1/workspaces/:wid/okrs/key-results/:krid', { preHandler: a }, async (req, reply) => {
    const kr = await analyticsService.updateKeyResult((req.params as any).krid, req.body as any);
    return reply.send({ success: true, data: kr });
  });
  // Events
  app.post('/api/v1/workspaces/:wid/events', { preHandler: a }, async (req, reply) => {
    const ev = await analyticsService.trackEvent((req.params as any).wid, req.body as any);
    return reply.code(201).send({ success: true, data: ev });
  });
  app.get('/api/v1/workspaces/:wid/events', { preHandler: a }, async (req, reply) => {
    const result = await analyticsService.queryEvents((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });
  // Insights
  app.get('/api/v1/workspaces/:wid/insights', { preHandler: a }, async (req, reply) => {
    const insights = await analyticsService.getWorkspaceInsights((req.params as any).wid);
    return reply.send({ success: true, data: insights });
  });
  app.get('/health', async () => ({ status: 'ok', service: 'analytics-service', timestamp: new Date().toISOString() }));
  return app;
}
