import type { FastifyInstance, FastifyRequest } from 'fastify';
import { reactionService } from '../services/reaction.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';

export async function reactionRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.post('/:wid/messages/:mid/reactions', { preHandler: [...ws] }, async (req, reply) => {
    const { emoji } = req.body as any;
    const result = await reactionService.toggle((req.params as any).mid, req.user.sub, emoji);
    return reply.send({ success: true, data: result });
  });

  app.delete('/:wid/messages/:mid/reactions/:emoji', { preHandler: [...ws] }, async (req, reply) => {
    const result = await reactionService.toggle((req.params as any).mid, req.user.sub, (req.params as any).emoji);
    return reply.send({ success: true, data: result });
  });

  app.get('/:wid/messages/:mid/reactions', { preHandler: [...ws] }, async (req, reply) => {
    const reactions = await reactionService.list((req.params as any).mid);
    return reply.send({ success: true, data: reactions });
  });
}
