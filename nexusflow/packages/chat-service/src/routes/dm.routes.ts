import type { FastifyInstance, FastifyRequest } from 'fastify';
import { dmService } from '../services/dm.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';

export async function dmRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.post('/:wid/dms', { preHandler: [...ws] }, async (req, reply) => {
    const { userIds, name } = req.body as any;
    let room;
    if (userIds?.length === 1) {
      room = await dmService.createOrFind1v1((req.params as any).wid, req.user.sub, userIds[0]);
    } else {
      room = await dmService.createGroup((req.params as any).wid, req.user.sub, { userIds, name });
    }
    return reply.code(201).send({ success: true, data: room });
  });

  app.get('/:wid/dms', { preHandler: [...ws] }, async (req, reply) => {
    const rooms = await dmService.listUserRooms((req.params as any).wid, req.user.sub);
    return reply.send({ success: true, data: rooms });
  });

  app.get('/:wid/dms/:roomId', { preHandler: [...ws] }, async (req, reply) => {
    const room = await dmService.getRoom((req.params as any).roomId);
    return reply.send({ success: true, data: room });
  });

  app.post('/:wid/dms/:roomId/messages', { preHandler: [...ws] }, async (req, reply) => {
    const msg = await dmService.sendMessage((req.params as any).wid, (req.params as any).roomId, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: msg });
  });

  app.get('/:wid/dms/:roomId/messages', { preHandler: [...ws] }, async (req, reply) => {
    const result = await dmService.listMessages((req.params as any).wid, (req.params as any).roomId, req.query as any);
    return reply.send({ success: true, ...result });
  });

  app.post('/:wid/dms/:roomId/members', { preHandler: [...ws] }, async (req, reply) => {
    await dmService.addMember((req.params as any).roomId, (req.body as any).userId);
    return reply.send({ success: true, data: { message: 'Member added' } });
  });

  app.delete('/:wid/dms/:roomId/members/:userId', { preHandler: [...ws] }, async (req, reply) => {
    await dmService.removeMember((req.params as any).roomId, (req.params as any).userId);
    return reply.send({ success: true, data: { message: 'Member removed' } });
  });

  app.post('/:wid/dms/:roomId/leave', { preHandler: [...ws] }, async (req, reply) => {
    await dmService.leave((req.params as any).roomId, req.user.sub);
    return reply.send({ success: true, data: { message: 'Left room' } });
  });
}
