import { prisma, type PrismaTx } from '../client.js';
import crypto from 'node:crypto';

export class ShareLinkRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.shareLink.findUnique({ where: { id } });
  }

  async findByToken(token: string, client: PrismaTx = prisma) {
    return client.shareLink.findUnique({
      where: { token },
      include: { creator: { select: { id: true, displayName: true } } },
    });
  }

  async findByWorkspace(workspaceId: string, client: PrismaTx = prisma) {
    return client.shareLink.findMany({
      where: { workspaceId, isRevoked: false },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, displayName: true } } },
    });
  }

  async create(data: {
    workspaceId: string;
    createdBy: string;
    resourceType: string;
    resourceId: string;
    permissions: string[];
    passwordHash?: string;
    maxAccesses?: number;
    expiresAt?: Date;
  }, client: PrismaTx = prisma) {
    const token = crypto.randomBytes(32).toString('base64url');
    return client.shareLink.create({
      data: {
        ...data,
        token,
        permissions: data.permissions,
      },
    });
  }

  async incrementAccess(id: string, client: PrismaTx = prisma) {
    return client.shareLink.update({
      where: { id },
      data: { accessCount: { increment: 1 } },
    });
  }

  async revoke(id: string, client: PrismaTx = prisma) {
    return client.shareLink.update({
      where: { id },
      data: { isRevoked: true },
    });
  }
}

export const shareLinkRepo = new ShareLinkRepository();
