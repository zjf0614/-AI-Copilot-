import { messageRepo, channelRepo, threadRepo, attachmentRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { SendMessageInput, EditMessageInput, CursorPagination } from '@nexusflow/shared';

export class MessageService {
  async send(workspaceId: string, userId: string, input: SendMessageInput) {
    if (!input.channelId && !input.roomId) throw AppError.validation('channelId or roomId required');

    const msg = await messageRepo.create({
      workspaceId,
      channelId: input.channelId,
      roomId: input.roomId,
      parentMessageId: input.parentMessageId,
      userId,
      messageType: input.messageType ?? 'RICH_TEXT',
      content: input.content,
    });

    // If this is a thread reply, create or update thread
    if (input.parentMessageId) {
      const existingThread = await threadRepo.findByRootMessage(input.parentMessageId);
      if (!existingThread) {
        await threadRepo.create({ workspaceId, rootMessageId: input.parentMessageId });
      }
      await threadRepo.incrementReplyCount(input.parentMessageId);
    }

    // Link attachments if provided
    if (input.attachmentIds?.length) {
      for (const aid of input.attachmentIds) {
        await attachmentRepo.findById(aid); // verify exists
        // In production, update the attachment's messageId
      }
    }

    // Return enriched message
    return messageRepo.findById(msg.id);
  }

  async listByChannel(workspaceId: string, channelId: string, pagination: CursorPagination) {
    return messageRepo.listByChannel(workspaceId, channelId, pagination);
  }

  async listByRoom(workspaceId: string, roomId: string, pagination: CursorPagination) {
    return messageRepo.listByRoom(workspaceId, roomId, pagination);
  }

  async getById(id: string, workspaceId: string) {
    const msg = await messageRepo.findById(id);
    if (!msg || msg.workspaceId !== workspaceId) throw AppError.notFound('Message', id);
    return msg;
  }

  async edit(id: string, userId: string, input: EditMessageInput) {
    const msg = await messageRepo.findById(id);
    if (!msg) throw AppError.notFound('Message', id);
    if (msg.userId !== userId) throw AppError.forbidden('You can only edit your own messages');
    return messageRepo.update(id, { content: input.content, messageType: input.messageType, isEdited: true, editedAt: new Date() } as any);
  }

  async delete(id: string, userId: string, userPermissions: string[]) {
    const msg = await messageRepo.findById(id);
    if (!msg) throw AppError.notFound('Message', id);
    const isAdmin = userPermissions.includes('message:manage') || userPermissions.includes('*:*');
    if (msg.userId !== userId && !isAdmin) throw AppError.forbidden('You can only delete your own messages');
    return messageRepo.softDelete(id);
  }

  async pin(id: string) { return messageRepo.pinMessage(id); }
  async unpin(id: string) { return messageRepo.unpinMessage(id); }
}

export const messageService = new MessageService();
