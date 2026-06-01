import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '@nexusflow/shared';

export async function workspaceIsolation(request: FastifyRequest, reply: FastifyReply) {
  const { wid } = request.params as { wid?: string };
  if (!wid) return;
  if (request.user.workspaceId !== wid && !request.user.permissions.includes('*:*')) {
    throw AppError.forbidden('Access to this workspace is not authorized');
  }
}
