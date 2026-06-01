// RBAC authorization middleware
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '@nexusflow/shared';

export function requirePermission(permission: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const { user } = request;
    const hasPermission = user.permissions.includes(permission) || user.permissions.includes('*:*');
    if (!hasPermission) throw AppError.forbidden(`Missing required permission: ${permission}`);
  };
}

export function requireAnyPermission(permissions: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const { user } = request;
    const hasPermission = user.permissions.includes('*:*') || permissions.some(p => user.permissions.includes(p));
    if (!hasPermission) throw AppError.forbidden(`Missing required permission. Requires one of: ${permissions.join(', ')}`);
  };
}
