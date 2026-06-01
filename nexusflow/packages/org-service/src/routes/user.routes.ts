import type { FastifyInstance, FastifyRequest } from 'fastify';
import { userService } from '../services/user.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { paginationSchema } from '@nexusflow/shared';

export async function userRoutes(app: FastifyInstance) {

  // List users
  app.get('/:wid/users', { preHandler: [authenticate, workspaceIsolation, requirePermission('user:read')] }, async (request, reply) => {
    const query = paginationSchema.safeParse(request.query).data ?? { page: 1, limit: 20 };
    const filters = request.query as any;
    const result = await userService.listUsers((request.params as any).wid, {
      ...query,
      status: filters.status,
      isGuest: filters.isGuest,
      search: filters.search,
    });
    return reply.send({
      success: true,
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
        hasNext: query.page * query.limit < result.total,
        hasPrev: query.page > 1,
      },
    });
  });

  // Get user
  app.get('/:wid/users/:uid', { preHandler: [authenticate, workspaceIsolation, requirePermission('user:read')] }, async (request, reply) => {
    const { wid, uid } = request.params as any;
    const user = await userService.getUser(wid, uid);
    return reply.send({ success: true, data: user });
  });

  // Update user
  app.patch('/:wid/users/:uid', { preHandler: [authenticate, workspaceIsolation, requirePermission('user:write')] }, async (request, reply) => {
    const { uid } = request.params as any;
    const user = await userService.updateUser(uid, request.body as any);
    return reply.send({ success: true, data: user });
  });

  // Deactivate user
  app.delete('/:wid/users/:uid', { preHandler: [authenticate, workspaceIsolation, requirePermission('user:delete')] }, async (request, reply) => {
    const { uid } = request.params as any;
    await userService.deactivateUser(uid);
    return reply.send({ success: true, data: { message: 'User deactivated' } });
  });

  // Reactivate user
  app.post('/:wid/users/:uid/reactivate', { preHandler: [authenticate, workspaceIsolation, requirePermission('user:write')] }, async (request, reply) => {
    const { uid } = request.params as any;
    await userService.reactivateUser(uid);
    return reply.send({ success: true, data: { message: 'User reactivated' } });
  });

  // Get user roles
  app.get('/:wid/users/:uid/roles', { preHandler: [authenticate, workspaceIsolation, requirePermission('user:read')] }, async (request, reply) => {
    const { uid } = request.params as any;
    const roles = await userService.getUserRoles(uid);
    return reply.send({ success: true, data: roles });
  });

  // Assign role
  app.post('/:wid/users/:uid/roles', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:assign')] }, async (request, reply) => {
    const { uid } = request.params as any;
    const assignment = await userService.assignRole(uid, request.body as any, request.user.sub);
    return reply.code(201).send({ success: true, data: assignment });
  });

  // Revoke role
  app.delete('/:wid/users/:uid/roles/:assignmentId', { preHandler: [authenticate, workspaceIsolation, requirePermission('role:assign')] }, async (request, reply) => {
    const { assignmentId } = request.params as any;
    await userService.revokeRole(assignmentId);
    return reply.send({ success: true, data: { message: 'Role revoked' } });
  });

  // Get user permissions
  app.get('/:wid/users/:uid/permissions', { preHandler: [authenticate, workspaceIsolation, requirePermission('user:read')] }, async (request, reply) => {
    const { wid, uid } = request.params as any;
    const perms = await userService.getUserPermissions(uid, wid);
    return reply.send({ success: true, data: perms });
  });

  // Get user org memberships
  app.get('/:wid/users/:uid/org', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const { uid } = request.params as any;
    const org = await userService.getUserOrg(uid);
    return reply.send({ success: true, data: org });
  });
}
