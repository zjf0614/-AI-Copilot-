import type { FastifyInstance, FastifyRequest } from 'fastify';
import { readReceiptRepo } from '@nexusflow/database';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';

export async function readReceiptRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.post('/:wid/read-receipts', { preHandler: [...ws] }, async (req, reply) => {
    const { channelId, roomId, lastReadMessageId } = req.body as any;
    await readReceiptRepo.upsert(req.user.sub, channelId ?? null, roomId ?? null, lastReadMessageId);
    return reply.send({ success: true, data: { message: 'Marked as read' } });
  });

  app.get('/:wid/read-receipts', { preHandler: [...ws] }, async (req, reply) => {
    const counts = await readReceiptRepo.getUnreadCounts(req.user.sub, (req.params as any).wid);
    return reply.send({ success: true, data: counts });
  });
}
