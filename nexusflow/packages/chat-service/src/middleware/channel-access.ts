import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '@nexusflow/shared';
import { prisma } from '@nexusflow/database';

// Ensure the user has access to a channel (member of private channel, or workspace member for public)
export async function channelAccess(request: FastifyRequest, reply: FastifyReply) {
  const { wid, cid } = request.params as { wid: string; cid: string };
  const userId = request.user.sub;

  const channel = await prisma.channel.findUnique({ where: { id: cid } });
  if (!channel || channel.workspaceId !== wid) {
    throw AppError.notFound('Channel', cid);
  }

  if (channel.channelType === 'PUBLIC' || channel.channelType === 'ANNOUNCEMENT') {
    return; // Any workspace member can access public/announcement channels
  }

  // Private channel — check membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: cid, userId } },
  });
  if (!membership) {
    throw AppError.forbidden('You are not a member of this private channel');
  }
}
