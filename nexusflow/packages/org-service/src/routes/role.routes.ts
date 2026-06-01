import type { FastifyInstance, FastifyRequest } from 'fastify';
import { roleService } from '../services/role.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { paginationSchema } from '@nexusflow/shared';

export async function roleRoutes(app: FastifyInstance) {

  // Create custom role
  app.post('/:wid/roles', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:manage')] }, async (request, reply) => {
    const { wid } = request.params as any;
    const role = await roleService.createRole(wid, request.body as any);
    return reply.code(201).send({ success: true, data: role });
  });

  // List roles
  app.get('/:wid/roles', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:read')] }, async (request, reply) => {
    const { wid } = request.params as any;
    const query = paginationSchema.safeParse(request.query).data ?? { page: 1, limit: 50 };
    const result = await roleService.listRoles(wid, query);
    return reply.send({
      success: true,
      data: result.data.map(r => ({ ...r, assignedUserCount: (r as any)._count?.userRoles ?? 0 })),
      pagination: { page: query.page, limit: query.limit, total: result.total },
    });
  });

  // Get role
  app.get('/:wid/roles/:rid', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:read')] }, async (request, reply) => {
    const { rid } = request.params as any;
    const role = await roleService.getRole(rid);
    return reply.send({ success: true, data: role });
  });

  // Update role
  app.patch('/:wid/roles/:rid', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:manage')] }, async (request, reply) => {
    const { rid } = request.params as any;
    const role = await roleService.updateRole(rid, request.body as any);
    return reply.send({ success: true, data: role });
  });

  // Delete role
  app.delete('/:wid/roles/:rid', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:manage')] }, async (request, reply) => {
    const { rid } = request.params as any;
    await roleService.deleteRole(rid);
    return reply.send({ success: true, data: { message: 'Role deleted' } });
  });

  // List users with role
  app.get('/:wid/roles/:rid/users', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:read')] }, async (request, reply) => {
    const { rid } = request.params as any;
    const query = paginationSchema.safeParse(request.query).data ?? { page: 1, limit: 20 };
    const result = await roleService.getUsersWithRole(rid, query);
    return reply.send({ success: true, data: result.data.map(ur => ({ assignmentId: ur.id, userId: ur.user.id, email: ur.user.email, displayName: ur.user.displayName, scopeType: ur.scopeType, expiresAt: ur.expiresAt })), pagination: { page: query.page, limit: query.limit, total: result.total } });
  });

  // List all available permissions
  app.get('/:wid/permissions', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:read')] }, async (request, reply) => {
    const perms = await roleService.listPermissions();
    return reply.send({ success: true, data: perms });
  });
}
