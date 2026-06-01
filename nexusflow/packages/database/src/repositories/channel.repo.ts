import { prisma, type PrismaTx } from '../client.js';

export class ChannelRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.channel.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
  }

  async findByName(workspaceId: string, name: string, client: PrismaTx = prisma) {
    return client.channel.findFirst({ where: { workspaceId, name, isDeleted: false } });
  }

  async listByWorkspace(
    workspaceId: string,
    opts: { channelType?: string; page?: number; limit?: number; archived?: boolean },
    client: PrismaTx = prisma,
  ) {
    const page = opts.page ?? 1;
    const limit = Math.min(100, opts.limit ?? 50);
    const where: Record<string, unknown> = { workspaceId, isDeleted: false };
    if (opts.channelType) where.channelType = opts.channelType;
    if (!opts.archived) where.isArchived = false;

    const [data, total] = await Promise.all([
      client.channel.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: true } } },
      }),
      client.channel.count({ where }),
    ]);
    return { data, total };
  }

  async create(data: { workspaceId: string; name: string; description?: string; channelType?: string; topic?: string; createdBy: string }, client: PrismaTx = prisma) {
    return client.channel.create({ data: data as any });
  }

  async update(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.channel.update({ where: { id }, data: data as any });
  }

  async softDelete(id: string, client: PrismaTx = prisma) {
    return client.channel.update({ where: { id }, data: { isDeleted: true } });
  }

  async archive(id: string, client: PrismaTx = prisma) {
    return client.channel.update({ where: { id }, data: { isArchived: true } });
  }

  async unarchive(id: string, client: PrismaTx = prisma) {
    return client.channel.update({ where: { id }, data: { isArchived: false } });
  }

  async addMember(channelId: string, userId: string, role: string = 'MEMBER', client: PrismaTx = prisma) {
    return client.channelMember.create({ data: { channelId, userId, role: role as any } });
  }

  async removeMember(channelId: string, userId: string, client: PrismaTx = prisma) {
    return client.channelMember.delete({ where: { channelId_userId: { channelId, userId } } });
  }

  async updateMemberRole(channelId: string, userId: string, role: string, client: PrismaTx = prisma) {
    return client.channelMember.update({ where: { channelId_userId: { channelId, userId } }, data: { role: role as any } });
  }

  async getMembers(channelId: string, client: PrismaTx = prisma) {
    return client.channelMember.findMany({
      where: { channelId },
      include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } },
    });
  }

  async isMember(channelId: string, userId: string, client: PrismaTx = prisma): Promise<boolean> {
    const m = await client.channelMember.findUnique({ where: { channelId_userId: { channelId, userId } } });
    return !!m;
  }
}

export const channelRepo = new ChannelRepository();
