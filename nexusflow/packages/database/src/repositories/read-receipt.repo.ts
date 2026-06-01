import { prisma, type PrismaTx } from '../client.js';

export class ReadReceiptRepository {
  async upsert(userId: string, channelId: string | null, roomId: string | null, lastReadMessageId: string, client: PrismaTx = prisma) {
    if (channelId) {
      return client.readReceipt.upsert({
        where: { userId_channelId: { userId, channelId } },
        create: { userId, channelId, lastReadMessageId },
        update: { lastReadMessageId, lastReadAt: new Date() },
      });
    }
    if (roomId) {
      return client.readReceipt.upsert({
        where: { userId_roomId: { userId, roomId } },
        create: { userId, roomId, lastReadMessageId },
        update: { lastReadMessageId, lastReadAt: new Date() },
      });
    }
    return null;
  }

  async getForUser(userId: string, client: PrismaTx = prisma) {
    return client.readReceipt.findMany({ where: { userId } });
  }

  async getUnreadCounts(userId: string, workspaceId: string, client: PrismaTx = prisma) {
    const receipts = await client.readReceipt.findMany({ where: { userId } });
    const results: { channelId?: string; roomId?: string; unreadCount: number }[] = [];

    for (const receipt of receipts) {
      const where: Record<string, unknown> = { workspaceId, isDeleted: false, createdAt: { gt: receipt.lastReadAt } };
      if (receipt.channelId) where.channelId = receipt.channelId;
      if (receipt.roomId) where.roomId = receipt.roomId;

      const count = await client.message.count({ where });
      results.push({
        channelId: receipt.channelId ?? undefined,
        roomId: receipt.roomId ?? undefined,
        unreadCount: count,
      });
    }
    return results;
  }
}

export const readReceiptRepo = new ReadReceiptRepository();
