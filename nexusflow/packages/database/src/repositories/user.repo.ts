import { prisma, type PrismaTx } from '../client.js';
import type { CreateUserInput, UpdateUserInput, UserStatus } from '@nexusflow/shared';

export class UserRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async findByEmail(workspaceId: string, email: string, client: PrismaTx = prisma) {
    return client.user.findFirst({
      where: { workspaceId, email: email.toLowerCase(), status: 'ACTIVE' },
      include: { userRoles: { include: { role: true } }, mfaConfig: true },
    });
  }

  async findByExternalId(workspaceId: string, ssoConfigId: string, externalId: string, client: PrismaTx = prisma) {
    return client.user.findFirst({
      where: { workspaceId, ssoConfigId, externalId },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async findMany(
    workspaceId: string,
    query: { page?: number; limit?: number; status?: UserStatus; isGuest?: boolean; search?: string },
    client: PrismaTx = prisma,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(100, query.limit ?? 20);
    const where: Record<string, unknown> = { workspaceId };
    if (query.status) where.status = query.status;
    if (query.isGuest !== undefined) where.isGuest = query.isGuest;
    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      client.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { userRoles: { include: { role: true } } },
      }),
      client.user.count({ where }),
    ]);
    return { data, total };
  }

  async create(input: CreateUserInput, roleIds: string[], _client: PrismaTx = prisma) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          workspaceId: input.workspaceId,
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash,
          displayName: input.displayName,
          isGuest: input.isGuest ?? false,
          ssoConfigId: input.ssoConfigId,
          externalId: input.externalId,
        },
      });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: user.id,
            roleId,
            scopeType: 'WORKSPACE',
            scopeId: input.workspaceId,
          })),
        });
      }
      return user;
    });
  }

  async update(id: string, input: UpdateUserInput, client: PrismaTx = prisma) {
    return client.user.update({ where: { id }, data: input });
  }

  async updateLoginInfo(id: string, ip: string, client: PrismaTx = prisma) {
    return client.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async incrementFailedAttempts(id: string, client: PrismaTx = prisma) {
    return client.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async lockAccount(id: string, durationMinutes: number, client: PrismaTx = prisma) {
    return client.user.update({
      where: { id },
      data: { lockedUntil: new Date(Date.now() + durationMinutes * 60 * 1000) },
    });
  }

  async deactivate(id: string, client: PrismaTx = prisma) {
    return client.user.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  async reactivate(id: string, client: PrismaTx = prisma) {
    return client.user.update({ where: { id }, data: { status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null } });
  }

  async countByWorkspace(workspaceId: string, client: PrismaTx = prisma) {
    return client.user.count({ where: { workspaceId, status: 'ACTIVE' } });
  }
}

export const userRepo = new UserRepository();
