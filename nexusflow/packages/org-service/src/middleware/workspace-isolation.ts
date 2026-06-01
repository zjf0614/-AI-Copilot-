// Workspace isolation middleware — ensures requests are scoped to the correct workspace

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '@nexusflow/shared';

export async function workspaceIsolation(request: FastifyRequest, reply: FastifyReply) {
  const { wid } = request.params as { wid?: string };

  if (!wid) {
    // Some routes don't have workspace context
    return;
  }

  // The user's workspaceId should match the requested workspace
  // unless they have cross-workspace admin privileges
  if (request.user.workspaceId !== wid) {
    // Check if user has admin cross-workspace permissions
    if (!request.user.permissions.includes('*:*')) {
      throw AppError.forbidden('Access to this workspace is not authorized');
    }
  }
}
