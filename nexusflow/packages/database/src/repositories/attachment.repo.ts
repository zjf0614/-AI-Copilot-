import { prisma, type PrismaTx } from '../client.js';
import crypto from 'node:crypto';

export class AttachmentRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.attachment.findUnique({ where: { id } });
  }

  async listByMessage(messageId: string, client: PrismaTx = prisma) {
    return client.attachment.findMany({ where: { messageId, isDeleted: false } });
  }

  async create(data: {
    messageId: string;
    workspaceId: string;
    fileName: string;
    fileSize: bigint | number;
    fileType: string;
    storageKey: string;
    thumbnailKey?: string;
    width?: number;
    height?: number;
    duration?: number;
  }, client: PrismaTx = prisma) {
    return client.attachment.create({ data: data as any });
  }

  async softDelete(id: string, client: PrismaTx = prisma) {
    return client.attachment.update({ where: { id }, data: { isDeleted: true } });
  }

  generateStorageKey(workspaceId: string, fileName: string): string {
    const ext = fileName.split('.').pop() ?? 'bin';
    return `${workspaceId}/${crypto.randomUUID()}.${ext}`;
  }
}

export const attachmentRepo = new AttachmentRepository();
