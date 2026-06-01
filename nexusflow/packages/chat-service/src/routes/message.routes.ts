import type { FastifyInstance, FastifyRequest } from 'fastify';
import { messageService } from '../services/message.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';

export async function messageRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.post('/:wid/channels/:cid/messages', { preHandler: [...ws] }, async (req, reply) => {
    const msg = await messageService.send((req.params as any).wid, req.user.sub, { ...(req.body as any), channelId: (req.params as any).cid });
    return reply.code(201).send({ success: true, data: msg });
  });

  app.get('/:wid/channels/:cid/messages', { preHandler: [...ws] }, async (req, reply) => {
    const result = await messageService.listByChannel((req.params as any).wid, (req.params as any).cid, req.query as any);
    return reply.send({ success: true, ...result });
  });

  app.get('/:wid/channels/:cid/messages/:mid', { preHandler: [...ws] }, async (req, reply) => {
    const msg = await messageService.getById((req.params as any).mid, (req.params as any).wid);
    return reply.send({ success: true, data: msg });
  });

  app.patch('/:wid/channels/:cid/messages/:mid', { preHandler: [...ws] }, async (req, reply) => {
    const msg = await messageService.edit((req.params as any).mid, req.user.sub, req.body as any);
    return reply.send({ success: true, data: msg });
  });

  app.delete('/:wid/channels/:cid/messages/:mid', { preHandler: [...ws] }, async (req, reply) => {
    await messageService.delete((req.params as any).mid, req.user.sub, req.user.permissions);
    return reply.send({ success: true, data: { message: 'Message deleted' } });
  });

  app.post('/:wid/channels/:cid/messages/:mid/pin', { preHandler: [...ws, (await import('../middleware/authorize.js')).requirePermission('channel:manage')] }, async (req, reply) => {
    await messageService.pin((req.params as any).mid);
    return reply.send({ success: true, data: { message: 'Message pinned' } });
  });

  app.delete('/:wid/channels/:cid/messages/:mid/pin', { preHandler: [...ws, (await import('../middleware/authorize.js')).requirePermission('channel:manage')] }, async (req, reply) => {
    await messageService.unpin((req.params as any).mid);
    return reply.send({ success: true, data: { message: 'Message unpinned' } });
  });
}
