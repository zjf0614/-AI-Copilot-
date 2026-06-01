// Audit log routes

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { auditRepo } from '@nexusflow/database';
import { AppError, auditQuerySchema } from '@nexusflow/shared';

export async function auditRoutes(app: FastifyInstance) {

  // Query audit logs
  app.get('/:wid/audit-logs', { preHandler: [authenticate, workspaceIsolation, requirePermission('audit:read')] }, async (request, reply) => {
    const parsed = auditQuerySchema.safeParse(request.query);
    if (!parsed.success) throw AppError.validation('Invalid query', parsed.error.flatten());

    const result = await auditRepo.query({
      workspaceId: (request.params as any).wid,
      ...(parsed.data as any),
    });

    return reply.send(result);
  });

  // Get single audit log
  app.get('/:wid/audit-logs/:id', { preHandler: [authenticate, workspaceIsolation, requirePermission('audit:read')] }, async (request, reply) => {
    const log = await auditRepo.findById((request.params as any).id);
    if (!log) throw AppError.notFound('Audit log');
    return reply.send({ success: true, data: log });
  });

  // Export audit logs
  app.post('/:wid/audit-logs/export', { preHandler: [authenticate, workspaceIsolation, requirePermission('audit:export')] }, async (request, reply) => {
    const { wid } = request.params as any;
    const { format, from, to } = request.body as any;

    const logs = await auditRepo.exportForCsv(wid, { workspaceId: wid, from, to });

    if (format === 'CSV') {
      const header = 'timestamp,actor_email,action,resource_type,resource_id,ip_address,compliance_tags,details\n';
      const rows = logs.map(log => {
        const timestamp = log.createdAt.toISOString();
        const actor = (log.actorEmail ?? 'system').replace(/"/g, '""');
        const action = log.action;
        const rtype = log.resourceType;
        const rid = log.resourceId ?? '';
        const ip = log.ipAddress ?? '';
        const tags = (log.complianceTags as string[]).join(';');
        const details = JSON.stringify(log.details).replace(/"/g, '""');
        return `"${timestamp}","${actor}","${action}","${rtype}","${rid}","${ip}","${tags}","${details}"`;
      }).join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="audit-export-${wid}.csv"`);
      return reply.send(header + rows);
    }

    // JSON export
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="audit-export-${wid}.json"`);
    return reply.send(JSON.stringify(logs, null, 2));
  });

  // Audit stats
  app.get('/:wid/audit-logs/stats', { preHandler: [authenticate, workspaceIsolation, requirePermission('audit:read')] }, async (request, reply) => {
    const { wid } = request.params as any;
    const { from, to } = request.query as any;
    const stats = await auditRepo.getStats(wid, from, to);
    return reply.send({ success: true, data: stats });
  });
}
