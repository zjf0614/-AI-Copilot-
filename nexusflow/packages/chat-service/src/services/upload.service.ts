import { attachmentRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import crypto from 'node:crypto';

export class UploadService {
  async createPresignedUpload(workspaceId: string, fileName: string, fileSize: number, fileType: string) {
    const storageKey = attachmentRepo.generateStorageKey(workspaceId, fileName);

    // In production, generate a presigned S3 URL here
    // For dev, return a local upload URL pointing to the chat service
    const uploadUrl = `http://localhost:${process.env.CHAT_PORT ?? '3003'}/api/v1/upload/${storageKey}`;

    // Create a placeholder attachment record; the actual messageId is set when the message is sent
    const attachment = await attachmentRepo.create({
      messageId: 'pending', // Will be updated when message is sent
      workspaceId,
      fileName,
      fileSize,
      fileType,
      storageKey,
    });

    return { uploadUrl, attachmentId: attachment.id, storageKey };
  }

  async getAttachment(attachmentId: string) {
    const att = await attachmentRepo.findById(attachmentId);
    if (!att) throw AppError.notFound('Attachment');
    return att;
  }

  async deleteAttachment(attachmentId: string) {
    return attachmentRepo.softDelete(attachmentId);
  }
}

export const uploadService = new UploadService();
