import { prisma, type PrismaTx } from '../client.js';
import crypto from 'node:crypto';

export class RefreshTokenRepository {
  async create(data: {
    userId: string;
    token: string;
    family: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
  }, client: PrismaTx = prisma) {
    const tokenHash = this.hashToken(data.token);
    return client.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash,
        family: data.family,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByHash(token: string, client: PrismaTx = prisma) {
    const tokenHash = this.hashToken(token);
    return client.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeToken(id: string, client: PrismaTx = prisma) {
    return client.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(family: string, client: PrismaTx = prisma) {
    return client.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async isFamilyCompromised(family: string, client: PrismaTx = prisma): Promise<boolean> {
    const revoked = await client.refreshToken.count({
      where: { family, revokedAt: { not: null } },
    });
    return revoked > 0;
  }

  async setReplacedBy(id: string, replacedById: string, client: PrismaTx = prisma) {
    return client.refreshToken.update({
      where: { id },
      data: { replacedBy: replacedById },
    });
  }

  async deleteExpired(client: PrismaTx = prisma) {
    return client.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export const refreshTokenRepo = new RefreshTokenRepository();
