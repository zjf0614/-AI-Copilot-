import { prisma, type PrismaTx } from '../client.js';

export class MessageReactionRepository {
  async add(messageId: string, userId: string, emoji: string, client: PrismaTx = prisma) {
    return client.messageReaction.create({ data: { messageId, userId, emoji } });
  }

  async remove(messageId: string, userId: string, emoji: string, client: PrismaTx = prisma) {
    return client.messageReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    }).catch(() => null);
  }

  async listByMessage(messageId: string, client: PrismaTx = prisma) {
    return client.messageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, displayName: true } } },
    });
  }

  async countByMessage(messageId: string, client: PrismaTx = prisma) {
    const counts = await client.messageReaction.groupBy({
      by: ['emoji'],
      where: { messageId },
      _count: true,
    });
    return counts.map(c => ({ emoji: c.emoji, count: c._count }));
  }

  async hasUserReacted(messageId: string, userId: string, emoji: string, client: PrismaTx = prisma): Promise<boolean> {
    const r = await client.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });
    return !!r;
  }
}

export const reactionRepo = new MessageReactionRepository();
