import { prisma, type PrismaTx } from '../client.js';

export class WorkspaceRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.workspace.findUnique({ where: { id } });
  }

  async findBySlug(slug: string, client: PrismaTx = prisma) {
    return client.workspace.findUnique({ where: { slug } });
  }

  async findMany(query: { page?: number; limit?: number }, client: PrismaTx = prisma) {
    const page = query.page ?? 1;
    const limit = Math.min(100, query.limit ?? 20);
    const [data, total] = await Promise.all([
      client.workspace.findMany({
        where: { isActive: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.workspace.count({ where: { isActive: true } }),
    ]);
    return { data, total };
  }

  async create(data: { name: string; slug: string; planTier?: string }, client: PrismaTx = prisma) {
    return client.workspace.create({ data: data as any });
  }

  async update(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.workspace.update({ where: { id }, data });
  }

  async softDelete(id: string, client: PrismaTx = prisma) {
    return client.workspace.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getStats(id: string, client: PrismaTx = prisma) {
    const [userCount, guestCount, roles, ssoCount] = await Promise.all([
      client.user.count({ where: { workspaceId: id, isGuest: false, status: 'ACTIVE' } }),
      client.user.count({ where: { workspaceId: id, isGuest: true, status: 'ACTIVE' } }),
      client.userRole.groupBy({ by: ['roleId'], where: { user: { workspaceId: id } }, _count: true }),
      client.ssoConfig.count({ where: { workspaceId: id, isEnabled: true } }),
    ]);
    const roleDistribution: Record<string, number> = {};
    for (const r of roles) {
      const role = await client.role.findUnique({ where: { id: r.roleId }, select: { name: true } });
      if (role) roleDistribution[role.name] = r._count;
    }
    return { userCount, guestCount, roleDistribution, ssoConfigured: ssoCount > 0 };
  }
}

export const workspaceRepo = new WorkspaceRepository();
