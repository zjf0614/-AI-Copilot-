import type { FastifyInstance, FastifyRequest } from 'fastify';
import { archiveService } from '../services/archive.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { requirePermission } from '../middleware/authorize.js';

export async function archiveRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.post('/:wid/archive/policies', { preHandler: [...ws, requirePermission('compliance:manage')] }, async (req, reply) => {
    const pol = await archiveService.createPolicy((req.params as any).wid, req.body as any);
    return reply.code(201).send({ success: true, data: pol });
  });

  app.get('/:wid/archive/policies', { preHandler: [...ws, requirePermission('compliance:read')] }, async (req, reply) => {
    const policies = await archiveService.listPolicies((req.params as any).wid);
    return reply.send({ success: true, data: policies });
  });

  app.patch('/:wid/archive/policies/:pid', { preHandler: [...ws, requirePermission('compliance:manage')] }, async (req, reply) => {
    const pol = await archiveService.updatePolicy((req.params as any).pid, req.body as any);
    return reply.send({ success: true, data: pol });
  });

  app.delete('/:wid/archive/policies/:pid', { preHandler: [...ws, requirePermission('compliance:manage')] }, async (req, reply) => {
    await archiveService.deletePolicy((req.params as any).pid);
    return reply.send({ success: true, data: { message: 'Policy deleted' } });
  });

  app.get('/:wid/archive/messages', { preHandler: [...ws, requirePermission('compliance:read')] }, async (req, reply) => {
    const result = await archiveService.queryArchived((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });

  app.post('/:wid/archive/export', { preHandler: [...ws, requirePermission('compliance:export')] }, async (req, reply) => {
    const result = await archiveService.exportMessages((req.params as any).wid, req.body as any);
    return reply.send({ success: true, data: result });
  });

  app.post('/:wid/archive/legal-hold', { preHandler: [...ws, requirePermission('compliance:manage')] }, async (req, reply) => {
    // Legal hold stub — creates a LEGAL_HOLD policy
    const { userId, channelId, reason } = req.body as any;
    const pol = await archiveService.createPolicy((req.params as any).wid, {
      name: `Legal Hold - ${reason?.slice(0, 50) ?? 'Manual'}`,
      channelId,
      policyType: 'LEGAL_HOLD',
      durationDays: 99999,
      action: 'ARCHIVE',
    });
    return reply.send({ success: true, data: pol });
  });
}
