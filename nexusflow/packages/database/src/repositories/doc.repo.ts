import { prisma, type PrismaTx } from '../client.js';

export class DocumentRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.document.findUnique({ where: { id }, include: { _count: { select: { versions: true, children: true } } } });
  }

  async findBySlug(workspaceId: string, slug: string, client: PrismaTx = prisma) {
    return client.document.findFirst({ where: { workspaceId, slug, isDeleted: false } });
  }

  async listByWorkspace(workspaceId: string, opts: { documentType?: string; parentId?: string | null; page?: number; limit?: number; search?: string }, client: PrismaTx = prisma) {
    const page = opts.page ?? 1; const limit = Math.min(100, opts.limit ?? 50);
    const where: Record<string, unknown> = { workspaceId, isDeleted: false };
    if (opts.documentType) where.documentType = opts.documentType;
    if (opts.parentId !== undefined) where.parentId = opts.parentId ?? null;
    if (opts.search) where.title = { contains: opts.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      client.document.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }], include: { _count: { select: { children: true, versions: true } } } }),
      client.document.count({ where }),
    ]);
    return { data, total };
  }

  async listChildren(parentId: string, client: PrismaTx = prisma) {
    return client.document.findMany({ where: { parentId, isDeleted: false }, orderBy: { sortOrder: 'asc' }, include: { _count: { select: { children: true } } } });
  }

  async create(data: { workspaceId: string; title: string; slug: string; documentType?: string; parentId?: string; createdBy: string; icon?: string }, client: PrismaTx = prisma) {
    return client.document.create({ data: data as any });
  }

  async update(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.document.update({ where: { id }, data: data as any });
  }

  async softDelete(id: string, client: PrismaTx = prisma) {
    return client.document.update({ where: { id }, data: { isDeleted: true } });
  }

  async archive(id: string, client: PrismaTx = prisma) {
    return client.document.update({ where: { id }, data: { isArchived: true } });
  }

  generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 200) + '-' + Date.now().toString(36);
  }

  // Versions
  async createVersion(data: { documentId: string; version: number; editorId: string; blocks: object; content?: object; changeLog?: string }, client: PrismaTx = prisma) {
    return client.documentVersion.create({ data: data as any });
  }

  async listVersions(documentId: string, client: PrismaTx = prisma) {
    return client.documentVersion.findMany({ where: { documentId }, orderBy: { version: 'desc' }, include: { editor: { select: { id: true, displayName: true } } } });
  }

  async getVersion(documentId: string, version: number, client: PrismaTx = prisma) {
    return client.documentVersion.findUnique({ where: { documentId_version: { documentId, version } }, include: { editor: { select: { id: true, displayName: true } } } });
  }

  // Templates
  async createTemplate(data: { workspaceId: string; name: string; description?: string; sourceDocId?: string; blocks?: object; content?: object; variables?: object[]; category?: string; isPublic?: boolean; createdBy: string }, client: PrismaTx = prisma) {
    return client.documentTemplate.create({ data: data as any });
  }

  async listTemplates(workspaceId: string, opts: { category?: string; page?: number; limit?: number }, client: PrismaTx = prisma) {
    const page = opts.page ?? 1; const limit = Math.min(100, opts.limit ?? 50);
    const where: Record<string, unknown> = { workspaceId };
    if (opts.category) where.category = opts.category;
    const [data, total] = await Promise.all([
      client.documentTemplate.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { usageCount: 'desc' } }),
      client.documentTemplate.count({ where }),
    ]);
    return { data, total };
  }

  async getTemplate(id: string, client: PrismaTx = prisma) {
    return client.documentTemplate.findUnique({ where: { id } });
  }

  async incrementTemplateUsage(id: string, client: PrismaTx = prisma) {
    return client.documentTemplate.update({ where: { id }, data: { usageCount: { increment: 1 } } });
  }

  async deleteTemplate(id: string, client: PrismaTx = prisma) {
    return client.documentTemplate.delete({ where: { id } });
  }

  // Backlinks
  async createBacklink(sourceDocId: string, targetDocId: string, context?: string, client: PrismaTx = prisma) {
    return client.documentBacklink.upsert({ where: { sourceDocId_targetDocId: { sourceDocId, targetDocId } }, create: { sourceDocId, targetDocId, context }, update: { context } });
  }

  async getBacklinks(targetDocId: string, client: PrismaTx = prisma) {
    return client.documentBacklink.findMany({ where: { targetDocId }, include: { sourceDoc: { select: { id: true, title: true, slug: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async getOutgoingLinks(sourceDocId: string, client: PrismaTx = prisma) {
    return client.documentBacklink.findMany({ where: { sourceDocId }, include: { targetDoc: { select: { id: true, title: true, slug: true } } } });
  }

  // Comments
  async createComment(data: { documentId: string; userId: string; blockId?: string; content: string; parentId?: string }, client: PrismaTx = prisma) {
    return client.documentComment.create({ data: data as any });
  }

  async listComments(documentId: string, client: PrismaTx = prisma) {
    return client.documentComment.findMany({ where: { documentId, parentId: null }, include: { user: { select: { id: true, displayName: true, avatarUrl: true } }, replies: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } } }, orderBy: { createdAt: 'asc' } });
  }

  async resolveComment(id: string, resolvedBy: string, client: PrismaTx = prisma) {
    return client.documentComment.update({ where: { id }, data: { isResolved: true, resolvedBy, resolvedAt: new Date() } });
  }

  async deleteComment(id: string, client: PrismaTx = prisma) {
    return client.documentComment.delete({ where: { id } });
  }

  // Search
  async searchDocuments(workspaceId: string, q: string, opts: { page?: number; limit?: number }, client: PrismaTx = prisma) {
    const page = opts.page ?? 1; const limit = Math.min(100, opts.limit ?? 20);
    const where = { workspaceId, isDeleted: false, title: { contains: q, mode: 'insensitive' as const } };
    const [data, total] = await Promise.all([client.document.findMany({ where, skip: (page - 1) * limit, take: limit, select: { id: true, title: true, slug: true, documentType: true, updatedAt: true } }), client.document.count({ where })]);
    return { data: data.map(d => ({ ...d, snippet: '' })), total };
  }
}

export const docRepo = new DocumentRepository();
