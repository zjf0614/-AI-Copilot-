import type { FastifyInstance, FastifyRequest } from 'fastify';
import { threadService } from '../services/thread.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { requirePermission } from '../middleware/authorize.js';

export async function threadRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.get('/:wid/channels/:cid/messages/:mid/thread', { preHandler: [...ws] }, async (req, reply) => {
    const result = await threadService.listReplies((req.params as any).wid, (req.params as any).mid, req.query as any);
    return reply.send({ success: true, ...result });
  });

  app.post('/:wid/channels/:cid/messages/:mid/thread', { preHandler: [...ws] }, async (req, reply) => {
    const msg = await threadService.reply((req.params as any).wid, (req.params as any).mid, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: msg });
  });

  app.post('/:wid/channels/:cid/messages/:mid/thread/lock', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    await threadService.lock((req.params as any).mid);
    return reply.send({ success: true, data: { message: 'Thread locked' } });
  });

  app.delete('/:wid/channels/:cid/messages/:mid/thread/lock', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    await threadService.unlock((req.params as any).mid);
    return reply.send({ success: true, data: { message: 'Thread unlocked' } });
  });

  app.get('/:wid/channels/:cid/messages/:mid/thread/summary', { preHandler: [...ws] }, async (req, reply) => {
    const summary = await threadService.getSummary((req.params as any).mid);
    return reply.send({ success: true, data: summary });
  });
}
