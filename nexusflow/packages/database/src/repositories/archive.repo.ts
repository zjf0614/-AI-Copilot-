import { prisma, type PrismaTx } from '../client.js';

export class ArchiveRepository {
  async createPolicy(data: {
    workspaceId: string;
    name: string;
    channelId?: string;
    policyType: string;
    durationDays: number;
    action: string;
  }, client: PrismaTx = prisma) {
    return client.archivePolicy.create({ data: data as any });
  }

  async listPolicies(workspaceId: string, client: PrismaTx = prisma) {
    return client.archivePolicy.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPolicy(id: string, client: PrismaTx = prisma) {
    return client.archivePolicy.findUnique({ where: { id } });
  }

  async updatePolicy(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.archivePolicy.update({ where: { id }, data: data as any });
  }

  async deletePolicy(id: string, client: PrismaTx = prisma) {
    return client.archivePolicy.delete({ where: { id } });
  }

  async archiveMessages(
    workspaceId: string,
    channelId: string | null,
    before: Date,
    policyId: string,
    client: PrismaTx = prisma,
  ) {
    // Fetch messages to archive
    const where: Record<string, unknown> = { workspaceId, isDeleted: false, createdAt: { lt: before } };
    if (channelId) where.channelId = channelId;

    const messages = await client.message.findMany({
      where,
      include: { attachments: true },
    });

    if (messages.length === 0) return 0;

    // Insert into archived_messages
    await client.archivedMessage.createMany({
      data: messages.map(m => ({
        originalMessageId: m.id,
        workspaceId: m.workspaceId,
        channelId: m.channelId,
        roomId: m.roomId,
        messageType: m.messageType,
        userId: m.userId,
        content: m.content as object,
        metadata: m.metadata as object,
        originalCreatedAt: m.createdAt,
        archivePolicyId: policyId,
      })),
    });

    // Soft-delete original messages
    await client.message.updateMany({
      where: { id: { in: messages.map(m => m.id) } },
      data: { isDeleted: true },
    });

    return messages.length;
  }

  async queryArchived(
    workspaceId: string,
    opts: { channelId?: string; from?: string; to?: string; page?: number; limit?: number },
    client: PrismaTx = prisma,
  ) {
    const page = opts.page ?? 1;
    const limit = Math.min(100, opts.limit ?? 50);
    const where: Record<string, unknown> = { workspaceId };
    if (opts.channelId) where.channelId = opts.channelId;
    if (opts.from || opts.to) {
      where.originalCreatedAt = {};
      if (opts.from) (where.originalCreatedAt as Record<string, unknown>).gte = new Date(opts.from);
      if (opts.to) (where.originalCreatedAt as Record<string, unknown>).lte = new Date(opts.to);
    }

    const [data, total] = await Promise.all([
      client.archivedMessage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { originalCreatedAt: 'desc' },
      }),
      client.archivedMessage.count({ where }),
    ]);
    return { data, total };
  }
}

export const archiveRepo = new ArchiveRepository();
