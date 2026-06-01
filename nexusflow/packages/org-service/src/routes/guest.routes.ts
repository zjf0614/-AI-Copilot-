// Guest and share link routes

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { guestRepo, shareLinkRepo, userRepo, roleRepo, workspaceRepo } from '@nexusflow/database';
import { AppError, createGuestInvitationSchema, acceptInvitationSchema, createShareLinkSchema } from '@nexusflow/shared';
import argon2 from 'argon2';

export async function guestRoutes(app: FastifyInstance) {

  // ─── GUEST INVITATIONS ──────────────────────────

  app.post('/:wid/guests/invite', { preHandler: [authenticate, workspaceIsolation, requirePermission('guest:manage')] }, async (request, reply) => {
    const parsed = createGuestInvitationSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());

    const { wid } = request.params as any;
    const { email, roleId, message, expiresInDays } = parsed.data;

    const invitation = await guestRepo.createInvitation({
      workspaceId: wid,
      inviterId: request.user.sub,
      email,
      roleId,
      message,
      expiresAt: new Date(Date.now() + (expiresInDays ?? 7) * 86400000),
    });

    return reply.code(201).send({ success: true, data: invitation });
  });

  app.get('/:wid/guests', { preHandler: [authenticate, workspaceIsolation, requirePermission('guest:read')] }, async (request, reply) => {
    const { status } = request.query as any;
    const invitations = await guestRepo.findByWorkspace((request.params as any).wid, status);
    return reply.send({ success: true, data: invitations });
  });

  app.post('/:wid/guests/:inviteId/resend', { preHandler: [authenticate, workspaceIsolation, requirePermission('guest:manage')] }, async (request, reply) => {
    const { inviteId } = request.params as any;
    await guestRepo.resendInvitation(inviteId, new Date(Date.now() + 7 * 86400000));
    return reply.send({ success: true, data: { message: 'Invitation resent' } });
  });

  app.delete('/:wid/guests/:inviteId', { preHandler: [authenticate, workspaceIsolation, requirePermission('guest:manage')] }, async (request, reply) => {
    await guestRepo.revokeInvitation((request.params as any).inviteId);
    return reply.send({ success: true, data: { message: 'Invitation revoked' } });
  });

  // Accept invitation (public)
  app.post('/guests/accept', async (request, reply) => {
    const parsed = acceptInvitationSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());

    const { invitationToken, displayName, password } = parsed.data;

    const invitation = await guestRepo.findByToken(invitationToken);
    if (!invitation) throw AppError.notFound('Invitation');
    if (invitation.status === 'EXPIRED' || new Date() > invitation.expiresAt) {
      throw new AppError('INVITATION_EXPIRED' as any, 'Invitation has expired', 410);
    }
    if (invitation.status !== 'PENDING') {
      throw new AppError('INVITATION_ALREADY_ACCEPTED' as any, 'Invitation already processed', 409);
    }

    // Create user as guest
    const { prisma } = await import('@nexusflow/database');
    const result = await prisma.$transaction(async (tx) => {
      const user = await userRepo.create({
        workspaceId: invitation.workspaceId,
        email: invitation.email,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 }),
        displayName,
        isGuest: true,
      }, [invitation.roleId], tx);

      await guestRepo.acceptInvitation(invitation.id, tx);
      return user;
    });

    return reply.code(201).send({
      success: true,
      data: { userId: result.id, email: result.email, displayName: result.displayName },
    });
  });

  // ─── SHARE LINKS ────────────────────────────────

  app.post('/:wid/share-links', { preHandler: [authenticate, workspaceIsolation, requirePermission('guest:manage')] }, async (request, reply) => {
    const parsed = createShareLinkSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());

    const link = await shareLinkRepo.create({
      resourceType: parsed.data.resourceType,
      resourceId: parsed.data.resourceId,
      workspaceId: (request.params as any).wid,
      createdBy: request.user.sub,
      permissions: parsed.data.permissions ?? [],
      passwordHash: parsed.data.password ? await argon2.hash(parsed.data.password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 }) : undefined,
      maxAccesses: parsed.data.maxAccesses,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    });

    return reply.code(201).send({ success: true, data: link });
  });

  app.get('/:wid/share-links', { preHandler: [authenticate, workspaceIsolation, requirePermission('guest:read')] }, async (request, reply) => {
    const links = await shareLinkRepo.findByWorkspace((request.params as any).wid);
    return reply.send({ success: true, data: links });
  });

  app.delete('/:wid/share-links/:sid', { preHandler: [authenticate, workspaceIsolation, requirePermission('guest:manage')] }, async (request, reply) => {
    await shareLinkRepo.revoke((request.params as any).sid);
    return reply.send({ success: true, data: { message: 'Share link revoked' } });
  });

  // Access shared resource (public)
  app.get('/share-links/:token', async (request, reply) => {
    const { token } = request.params as any;
    const link = await shareLinkRepo.findByToken(token);

    if (!link || link.isRevoked) throw AppError.notFound('Share link');
    if (link.expiresAt && new Date() > link.expiresAt) {
      throw new AppError('SHARE_LINK_REVOKED' as any, 'Share link has expired', 410);
    }
    if (link.maxAccesses && link.accessCount >= link.maxAccesses) {
      throw new AppError('SHARE_LINK_REVOKED' as any, 'Share link access limit reached', 410);
    }

    await shareLinkRepo.incrementAccess(link.id);

    return reply.send({
      success: true,
      data: {
        resourceType: link.resourceType,
        resourceId: link.resourceId,
        permissions: link.permissions,
      },
    });
  });
}
