import { messageRepo, prisma } from '@nexusflow/database';
import type { MessageSearchQuery, QuickSearchResult } from '@nexusflow/shared';

export class SearchService {
  async searchMessages(workspaceId: string, query: MessageSearchQuery) {
    return messageRepo.searchMessages(workspaceId, query);
  }

  async searchFiles(workspaceId: string, query: { q?: string; channelId?: string; fileType?: string; page?: number; limit?: number }) {
    return messageRepo.searchFiles(workspaceId, query);
  }

  async quickSearch(workspaceId: string, q: string, limit = 10): Promise<QuickSearchResult> {
    const [messages, channels, users] = await Promise.all([
      prisma.message.findMany({
        where: { workspaceId, isDeleted: false },
        select: { id: true, content: true, channelId: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.channel.findMany({
        where: { workspaceId, isDeleted: false, name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true },
        take: limit,
      }),
      prisma.user.findMany({
        where: { workspaceId, status: 'ACTIVE', OR: [{ displayName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] },
        select: { id: true, displayName: true, email: true },
        take: limit,
      }),
    ]);

    return {
      messages: messages.map(m => ({
        id: m.id,
        text: (m.content as any)?.text?.slice(0, 200) ?? '',
        channelId: m.channelId,
        channelName: null,
      })),
      channels: channels.map(c => ({ id: c.id, name: c.name })),
      users: users.map(u => ({ id: u.id, displayName: u.displayName, email: u.email })),
    };
  }
}

export const searchService = new SearchService();
