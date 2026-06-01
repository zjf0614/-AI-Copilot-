import { prisma, type PrismaTx } from '../client.js';

export class ThreadRepository {
  async findByRootMessage(rootMessageId: string, client: PrismaTx = prisma) {
    return client.thread.findUnique({
      where: { rootMessageId },
      include: { rootMessage: true },
    });
  }

  async findById(id: string, client: PrismaTx = prisma) {
    return client.thread.findUnique({
      where: { id },
      include: { rootMessage: true },
    });
  }

  async create(data: { workspaceId: string; rootMessageId: string }, client: PrismaTx = prisma) {
    return client.thread.create({ data });
  }

  async incrementReplyCount(rootMessageId: string, client: PrismaTx = prisma) {
    return client.thread.update({
      where: { rootMessageId },
      data: { replyCount: { increment: 1 }, lastReplyAt: new Date() },
    });
  }

  async lock(rootMessageId: string, client: PrismaTx = prisma) {
    return client.thread.update({ where: { rootMessageId }, data: { isLocked: true } });
  }

  async unlock(rootMessageId: string, client: PrismaTx = prisma) {
    return client.thread.update({ where: { rootMessageId }, data: { isLocked: false } });
  }

  async updateSummary(rootMessageId: string, summary: string, client: PrismaTx = prisma) {
    return client.thread.update({ where: { rootMessageId }, data: { summary } });
  }
}

export const threadRepo = new ThreadRepository();
