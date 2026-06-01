import { prisma, type PrismaTx } from '../client.js';
import type { CursorPagination } from '@nexusflow/shared';

export class MessageRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.message.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        reactions: { include: { user: { select: { id: true, displayName: true } } } },
        attachments: true,
      },
    });
  }

  async listByChannel(
    workspaceId: string,
    channelId: string,
    pagination: CursorPagination,
    client: PrismaTx = prisma,
  ) {
    const limit = Math.min(200, pagination.limit ?? 50);
    const where: Record<string, unknown> = { workspaceId, channelId, isDeleted: false };

    if (pagination.before) where.createdAt = { lt: new Date(pagination.before) };
    if (pagination.after) where.createdAt = { gt: new Date(pagination.after) };

    const data = await client.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        reactions: { include: { user: { select: { id: true, displayName: true } } } },
        attachments: true,
        thread: { select: { id: true, replyCount: true, isLocked: true } },
      },
    });

    return { data, hasMore: data.length === limit };
  }

  async listByRoom(workspaceId: string, roomId: string, pagination: CursorPagination, client: PrismaTx = prisma) {
    const limit = Math.min(200, pagination.limit ?? 50);
    const where: Record<string, unknown> = { workspaceId, roomId, isDeleted: false };
    if (pagination.before) where.createdAt = { lt: new Date(pagination.before) };
    if (pagination.after) where.createdAt = { gt: new Date(pagination.after) };

    const data = await client.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        reactions: { include: { user: { select: { id: true, displayName: true } } } },
        attachments: true,
      },
    });
    return { data, hasMore: data.length === limit };
  }

  async listThreadReplies(workspaceId: string, parentMessageId: string, pagination: CursorPagination, client: PrismaTx = prisma) {
    const limit = Math.min(200, pagination.limit ?? 50);
    const where: Record<string, unknown> = { workspaceId, parentMessageId, isDeleted: false };
    if (pagination.after) where.createdAt = { gt: new Date(pagination.after) };

    const data = await client.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        reactions: { include: { user: { select: { id: true, displayName: true } } } },
        attachments: true,
      },
    });
    return { data, hasMore: data.length === limit };
  }

  async create(data: {
    workspaceId: string;
    channelId?: string;
    roomId?: string;
    parentMessageId?: string;
    userId: string;
    messageType?: string;
    content: object;
  }, client: PrismaTx = prisma) {
    return client.message.create({ data: data as any });
  }

  async update(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.message.update({ where: { id }, data: data as any });
  }

  async softDelete(id: string, client: PrismaTx = prisma) {
    return client.message.update({ where: { id }, data: { isDeleted: true } });
  }

  async pinMessage(id: string, client: PrismaTx = prisma) {
    return client.message.update({ where: { id }, data: { isPinned: true } });
  }

  async unpinMessage(id: string, client: PrismaTx = prisma) {
    return client.message.update({ where: { id }, data: { isPinned: false } });
  }

  // PostgreSQL full-text search using $queryRaw
  async searchMessages(
    workspaceId: string,
    query: { q: string; channelId?: string; userId?: string; from?: string; to?: string; fileType?: string; page?: number; limit?: number },
    client: PrismaTx = prisma,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(100, query.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: string[] = [`m.workspace_id = $1`, `m.is_deleted = false`];
    const params: unknown[] = [workspaceId];
    let paramIdx = 2;

    if (query.q) {
      conditions.push(`m.search_vector @@ plainto_tsquery('english', $${paramIdx})`);
      params.push(query.q);
      paramIdx++;
    }
    if (query.channelId) { conditions.push(`m.channel_id = $${paramIdx}`); params.push(query.channelId); paramIdx++; }
    if (query.userId) { conditions.push(`m.user_id = $${paramIdx}`); params.push(query.userId); paramIdx++; }
    if (query.from) { conditions.push(`m.created_at >= $${paramIdx}`); params.push(new Date(query.from)); paramIdx++; }
    if (query.to) { conditions.push(`m.created_at <= $${paramIdx}`); params.push(new Date(query.to)); paramIdx++; }
    if (query.fileType) { conditions.push(`m.message_type = 'FILE' AND m.content->>'fileType' = $${paramIdx}`); params.push(query.fileType); paramIdx++; }

    const whereClause = conditions.join(' AND ');

    const countResult = await client.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM messages m WHERE ${whereClause}`,
      ...params,
    );
    const total = Number(countResult[0]?.count ?? 0);

    const data = await client.$queryRawUnsafe<any[]>(
      `SELECT m.*, u.display_name, u.email, u.avatar_url
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...params, limit, offset,
    );

    return { data, total };
  }

  async searchFiles(workspaceId: string, query: { q?: string; channelId?: string; fileType?: string; page?: number; limit?: number }, client: PrismaTx = prisma) {
    const page = query.page ?? 1;
    const limit = Math.min(100, query.limit ?? 20);
    const where: Record<string, unknown> = { workspaceId, message: { messageType: 'FILE', isDeleted: false } };
    if (query.channelId) where.message = { ...where.message as any, channelId: query.channelId };
    if (query.fileType) where.fileType = { contains: query.fileType };

    const [data, total] = await Promise.all([
      client.attachment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.attachment.count({ where }),
    ]);
    return { data, total };
  }
}

export const messageRepo = new MessageRepository();
