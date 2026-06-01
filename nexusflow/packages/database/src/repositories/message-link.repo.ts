import { prisma, type PrismaTx } from '../client.js';

export class MessageLinkRepository {
  async create(data: {
    sourceMessageId: string;
    targetMessageId?: string;
    targetResourceType: string;
    targetResourceId: string;
    previewData?: object;
  }, client: PrismaTx = prisma) {
    return client.messageLink.create({ data: data as any });
  }

  async findBySource(sourceMessageId: string, client: PrismaTx = prisma) {
    return client.messageLink.findMany({ where: { sourceMessageId } });
  }

  async findBacklinks(targetResourceType: string, targetResourceId: string, client: PrismaTx = prisma) {
    return client.messageLink.findMany({
      where: { targetResourceType, targetResourceId },
      include: {
        sourceMessage: { select: { id: true, content: true, createdAt: true, channelId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const messageLinkRepo = new MessageLinkRepository();
