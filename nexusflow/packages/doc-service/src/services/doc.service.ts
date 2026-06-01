import { docRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { CreateDocInput, UpdateDocInput, CreateVersionInput, CreateTemplateInput, CreateCommentInput } from '@nexusflow/shared';

export class DocService {
  async create(workspaceId: string, createdBy: string, input: CreateDocInput) {
    const slug = input.slug ?? docRepo.generateSlug(input.title);
    const existing = await docRepo.findBySlug(workspaceId, slug);
    if (existing) throw AppError.conflict('Document slug already exists');
    return docRepo.create({ ...input, workspaceId, slug, createdBy });
  }

  async getById(id: string) {
    const doc = await docRepo.findById(id);
    if (!doc || doc.isDeleted) throw AppError.notFound('Document', id);
    return doc;
  }

  async getBySlug(workspaceId: string, slug: string) {
    const doc = await docRepo.findBySlug(workspaceId, slug);
    if (!doc) throw AppError.notFound('Document');
    return doc;
  }

  async list(workspaceId: string, opts: any) { return docRepo.listByWorkspace(workspaceId, opts); }
  async listChildren(parentId: string) { return docRepo.listChildren(parentId); }

  async update(id: string, lastEditedBy: string, input: UpdateDocInput) {
    const doc = await docRepo.findById(id);
    if (!doc) throw AppError.notFound('Document', id);
    return docRepo.update(id, { ...input, lastEditedBy });
  }

  async softDelete(id: string) { return docRepo.softDelete(id); }
  async archive(id: string) { return docRepo.archive(id); }

  // Version management
  async createVersion(documentId: string, editorId: string, input: CreateVersionInput) {
    const doc = await docRepo.findById(documentId);
    if (!doc) throw AppError.notFound('Document', documentId);
    const nextVersion = ((doc as any)._count?.versions ?? 0) + 1;
    return docRepo.createVersion({ documentId, version: nextVersion, editorId, blocks: input.blocks as any, content: input.content, changeLog: input.changeLog });
  }

  async listVersions(documentId: string) { return docRepo.listVersions(documentId); }
  async getVersion(documentId: string, version: number) { return docRepo.getVersion(documentId, version); }

  async rollback(documentId: string, editorId: string, version: number) {
    const ver = await docRepo.getVersion(documentId, version);
    if (!ver) throw AppError.notFound('Version');
    await docRepo.update(documentId, { blocks: ver.blocks as any, lastEditedBy: editorId });
    await this.createVersion(documentId, editorId, { blocks: ver.blocks as any, changeLog: `Rolled back to version ${version}` });
    return docRepo.findById(documentId);
  }

  // Templates
  async createTemplate(workspaceId: string, createdBy: string, input: CreateTemplateInput) {
    return docRepo.createTemplate({ ...input, workspaceId, createdBy });
  }

  async listTemplates(workspaceId: string, opts: any) { return docRepo.listTemplates(workspaceId, opts); }

  async getTemplate(id: string) {
    const t = await docRepo.getTemplate(id);
    if (!t) throw AppError.notFound('Template', id);
    return t;
  }

  async useTemplate(templateId: string, workspaceId: string, createdBy: string, variables: Record<string, string>) {
    const tpl = await docRepo.getTemplate(templateId);
    if (!tpl) throw AppError.notFound('Template', templateId);
    await docRepo.incrementTemplateUsage(templateId);
    let content = JSON.stringify(tpl.blocks ?? tpl.content);
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return this.create(workspaceId, createdBy, { title: tpl.name, blocks: JSON.parse(content), documentType: 'PAGE' });
  }

  async deleteTemplate(id: string) { return docRepo.deleteTemplate(id); }

  // Backlinks
  async processBacklinks(documentId: string, blocks: any[]) {
    const text = JSON.stringify(blocks);
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      try {
        const target = await docRepo.findBySlug('', match[1]!); // slug-based lookup
        if (target) await docRepo.createBacklink(documentId, target.id, match[0]);
      } catch { /* skip unresolvable links */ }
    }
  }

  async getBacklinks(documentId: string) { return docRepo.getBacklinks(documentId); }
  async getOutgoingLinks(documentId: string) { return docRepo.getOutgoingLinks(documentId); }

  // Comments
  async createComment(documentId: string, userId: string, input: CreateCommentInput) {
    return docRepo.createComment({ ...input, documentId, userId });
  }

  async listComments(documentId: string) { return docRepo.listComments(documentId); }

  async resolveComment(commentId: string, resolvedBy: string) {
    return docRepo.resolveComment(commentId, resolvedBy);
  }

  async deleteComment(commentId: string) { return docRepo.deleteComment(commentId); }

  // Search
  async search(workspaceId: string, q: string, opts: any) { return docRepo.searchDocuments(workspaceId, q, opts); }
}

export const docService = new DocService();
