import type { FastifyInstance, FastifyRequest } from 'fastify';
import { searchService } from '../services/search.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';

export async function searchRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.get('/:wid/search/messages', { preHandler: [...ws] }, async (req, reply) => {
    const result = await searchService.searchMessages((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });

  app.get('/:wid/search/files', { preHandler: [...ws] }, async (req, reply) => {
    const result = await searchService.searchFiles((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });

  app.get('/:wid/search/quick', { preHandler: [...ws] }, async (req, reply) => {
    const { q } = req.query as any;
    const result = await searchService.quickSearch((req.params as any).wid, q ?? '');
    return reply.send({ success: true, data: result });
  });
}
