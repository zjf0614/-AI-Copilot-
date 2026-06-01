import { prisma, type PrismaTx } from '../client.js';
import crypto from 'node:crypto';

export class SessionRepository {
  async create(data: {
    userId: string;
    sessionToken: string;
    ipAddress?: string;
    userAgent?: string;
    mfaVerified: boolean;
    expiresAt: Date;
  }, client: PrismaTx = prisma) {
    const sessionTokenHash = this.hashToken(data.sessionToken);
    return client.session.create({
      data: {
        userId: data.userId,
        sessionTokenHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        mfaVerified: data.mfaVerified,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByHash(sessionToken: string, client: PrismaTx = prisma) {
    const sessionTokenHash = this.hashToken(sessionToken);
    return client.session.findUnique({ where: { sessionTokenHash } });
  }

  async findByUser(userId: string, client: PrismaTx = prisma) {
    return client.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string, client: PrismaTx = prisma) {
    return client.session.delete({ where: { id } });
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string, client: PrismaTx = prisma) {
    const where: Record<string, unknown> = { userId };
    if (exceptSessionId) where.id = { not: exceptSessionId };
    return client.session.deleteMany({ where });
  }

  async deleteExpired(client: PrismaTx = prisma) {
    return client.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export const sessionRepo = new SessionRepository();
