import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { AppError } from '@nexusflow/shared';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { notificationService } from './services/notification.service.js';

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
  // Notifications
  app.get('/api/v1/workspaces/:wid/notifications', { preHandler: a }, async (req, reply) => {
    const result = await notificationService.list((req.params as any).wid, (req as any).user.sub, req.query as any);
    return reply.send({ success: true, ...result });
  });
  app.post('/api/v1/workspaces/:wid/notifications/:nid/read', { preHandler: a }, async (req, reply) => {
    await notificationService.markRead((req.params as any).nid, (req as any).user.sub);
    return reply.send({ success: true, data: { message: 'Marked as read' } });
  });
  app.post('/api/v1/workspaces/:wid/notifications/read-all', { preHandler: a }, async (req, reply) => {
    await notificationService.markAllRead((req.params as any).wid, (req as any).user.sub);
    return reply.send({ success: true, data: { message: 'All marked as read' } });
  });
  // Preferences
  app.get('/api/v1/workspaces/:wid/notification-prefs', { preHandler: a }, async (req, reply) => {
    const prefs = await notificationService.getPreferences((req.params as any).wid, (req as any).user.sub);
    return reply.send({ success: true, data: prefs });
  });
  app.put('/api/v1/workspaces/:wid/notification-prefs', { preHandler: a }, async (req, reply) => {
    const pref = await notificationService.updatePreference((req.params as any).wid, (req as any).user.sub, req.body as any);
    return reply.send({ success: true, data: pref });
  });
  // Integrations
  app.get('/api/v1/workspaces/:wid/integrations', { preHandler: a }, async (req, reply) => {
    const integrations = await notificationService.listIntegrations((req.params as any).wid);
    return reply.send({ success: true, data: integrations });
  });
  app.post('/api/v1/workspaces/:wid/integrations', { preHandler: a }, async (req, reply) => {
    const integration = await notificationService.createIntegration((req.params as any).wid, req.body as any);
    return reply.code(201).send({ success: true, data: integration });
  });
  app.delete('/api/v1/workspaces/:wid/integrations/:iid', { preHandler: a }, async (req, reply) => {
    await notificationService.deleteIntegration((req.params as any).iid);
    return reply.send({ success: true, data: { message: 'Integration deleted' } });
  });
  // Webhooks
  app.get('/api/v1/workspaces/:wid/webhooks', { preHandler: a }, async (req, reply) => {
    const hooks = await notificationService.listWebhooks((req.params as any).wid);
    return reply.send({ success: true, data: hooks });
  });
  app.post('/api/v1/workspaces/:wid/webhooks', { preHandler: a }, async (req, reply) => {
    const hook = await notificationService.createWebhook((req.params as any).wid, req.body as any);
    return reply.code(201).send({ success: true, data: hook });
  });
  app.delete('/api/v1/workspaces/:wid/webhooks/:hid', { preHandler: a }, async (req, reply) => {
    await notificationService.deleteWebhook((req.params as any).hid);
    return reply.send({ success: true, data: { message: 'Webhook deleted' } });
  });

  app.get('/health', async () => ({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() }));
  return app;
}
