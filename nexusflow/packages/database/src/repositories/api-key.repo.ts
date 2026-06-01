import { prisma, type PrismaTx } from '../client.js';
import crypto from 'node:crypto';

export class ApiKeyRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.apiKey.findUnique({ where: { id } });
  }

  async findByHash(keyHash: string, client: PrismaTx = prisma) {
    return client.apiKey.findUnique({
      where: { keyHash },
      include: { user: { select: { id: true, email: true, workspaceId: true, status: true } } },
    });
  }

  async findByUser(userId: string, client: PrismaTx = prisma) {
    return client.apiKey.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    workspaceId: string;
    userId: string;
    name: string;
    scopes: string[];
    expiresAt?: Date;
  }, client: PrismaTx = prisma) {
    const rawKey = `nf_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 10); // "nf_" + 8 chars

    const apiKey = await client.apiKey.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        name: data.name,
        keyHash,
        prefix,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
      },
    });

    return { apiKey, rawKey };
  }

  async updateLastUsed(id: string, client: PrismaTx = prisma) {
    return client.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  async revoke(id: string, client: PrismaTx = prisma) {
    return client.apiKey.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async countByUser(userId: string, client: PrismaTx = prisma): Promise<number> {
    return client.apiKey.count({ where: { userId, isRevoked: false } });
  }
}

export const apiKeyRepo = new ApiKeyRepository();
