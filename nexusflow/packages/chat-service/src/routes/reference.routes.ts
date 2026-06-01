import type { FastifyInstance, FastifyRequest } from 'fastify';
import { referenceService } from '../services/reference.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';

export async function referenceRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.get('/:wid/references/unfurl', { preHandler: [...ws] }, async (req, reply) => {
    const { url, resourceType, resourceId } = req.query as any;
    const preview = await referenceService.unfurl(resourceType ?? 'link', resourceId ?? '0', url);
    return reply.send({ success: true, data: preview });
  });

  app.get('/:wid/references/backlinks/:mid', { preHandler: [...ws] }, async (req, reply) => {
    const links = await referenceService.getBacklinks('message', (req.params as any).mid);
    return reply.send({ success: true, data: links });
  });
}
