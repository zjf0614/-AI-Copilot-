// RBAC authorization middleware — checks user has required permission

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '@nexusflow/shared';
import { auditRepo } from '@nexusflow/database';

export function requirePermission(permission: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const { user } = request;

    // Check if user has the required permission
    const hasPermission =
      user.permissions.includes(permission) ||
      user.permissions.includes('*:*'); // Wildcard

    if (!hasPermission) {
      // Log denied access
      const { wid } = request.params as { wid?: string };
      if (wid) {
        await auditRepo.log({
          workspaceId: wid,
          actorId: user.sub,
          actorEmail: user.email,
          action: 'PERMISSION_CHECK_DENIED',
          resourceType: 'permission',
          resourceId: null,
          details: { requiredPermission: permission, reason: 'RBAC' },
          ipAddress: request.ip,
        });
      }

      throw AppError.forbidden(`Missing required permission: ${permission}`);
    }
  };
}

// Check multiple permissions (any one is sufficient)
export function requireAnyPermission(permissions: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const { user } = request;

    const hasPermission =
      user.permissions.includes('*:*') ||
      permissions.some(p => user.permissions.includes(p));

    if (!hasPermission) {
      throw AppError.forbidden(`Missing required permission. Requires one of: ${permissions.join(', ')}`);
    }
  };
}
