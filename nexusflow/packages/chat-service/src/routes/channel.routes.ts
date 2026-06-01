import type { FastifyInstance, FastifyRequest } from 'fastify';
import { channelService } from '../services/channel.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { requirePermission } from '../middleware/authorize.js';

export async function channelRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.post('/:wid/channels', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    const ch = await channelService.create((req.params as any).wid, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: ch });
  });

  app.get('/:wid/channels', { preHandler: [...ws] }, async (req, reply) => {
    const result = await channelService.list((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });

  app.get('/:wid/channels/:cid', { preHandler: [...ws, requirePermission('channel:read')] }, async (req, reply) => {
    const ch = await channelService.getById((req.params as any).cid);
    return reply.send({ success: true, data: ch });
  });

  app.patch('/:wid/channels/:cid', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    const ch = await channelService.update((req.params as any).cid, req.body as any);
    return reply.send({ success: true, data: ch });
  });

  app.delete('/:wid/channels/:cid', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    await channelService.softDelete((req.params as any).cid);
    return reply.send({ success: true, data: { message: 'Channel deleted' } });
  });

  app.post('/:wid/channels/:cid/join', { preHandler: [...ws] }, async (req, reply) => {
    await channelService.joinChannel((req.params as any).cid, req.user.sub);
    return reply.send({ success: true, data: { message: 'Joined channel' } });
  });

  app.post('/:wid/channels/:cid/leave', { preHandler: [...ws] }, async (req, reply) => {
    await channelService.leaveChannel((req.params as any).cid, req.user.sub);
    return reply.send({ success: true, data: { message: 'Left channel' } });
  });

  app.post('/:wid/channels/:cid/members', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    const { userId, role } = req.body as any;
    await channelService.addMember((req.params as any).cid, userId, role);
    return reply.code(201).send({ success: true, data: { message: 'Member added' } });
  });

  app.delete('/:wid/channels/:cid/members/:userId', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    await channelService.removeMember((req.params as any).cid, (req.params as any).userId);
    return reply.send({ success: true, data: { message: 'Member removed' } });
  });

  app.get('/:wid/channels/:cid/members', { preHandler: [...ws, requirePermission('channel:read')] }, async (req, reply) => {
    const members = await channelService.getMembers((req.params as any).cid);
    return reply.send({ success: true, data: members });
  });

  app.patch('/:wid/channels/:cid/members/:userId', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    const { role } = req.body as any;
    await channelService.updateMemberRole((req.params as any).cid, (req.params as any).userId, role);
    return reply.send({ success: true, data: { message: 'Member role updated' } });
  });

  app.post('/:wid/channels/:cid/archive', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    await channelService.archive((req.params as any).cid);
    return reply.send({ success: true, data: { message: 'Channel archived' } });
  });

  app.post('/:wid/channels/:cid/unarchive', { preHandler: [...ws, requirePermission('channel:manage')] }, async (req, reply) => {
    await channelService.unarchive((req.params as any).cid);
    return reply.send({ success: true, data: { message: 'Channel unarchived' } });
  });
}
