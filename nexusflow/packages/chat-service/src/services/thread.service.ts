import { threadRepo, messageRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { ThreadReplyInput, CursorPagination } from '@nexusflow/shared';
import { messageService } from './message.service.js';

export class ThreadService {
  async getThread(rootMessageId: string, workspaceId: string) {
    const thread = await threadRepo.findByRootMessage(rootMessageId);
    if (!thread) throw AppError.notFound('Thread');
    return thread;
  }

  async listReplies(workspaceId: string, rootMessageId: string, pagination: CursorPagination) {
    return messageRepo.listThreadReplies(workspaceId, rootMessageId, pagination);
  }

  async reply(workspaceId: string, rootMessageId: string, userId: string, input: ThreadReplyInput) {
    const thread = await threadRepo.findByRootMessage(rootMessageId);
    if (thread?.isLocked) throw new AppError('THREAD_LOCKED' as any, 'Thread is locked', 403);

    return messageService.send(workspaceId, userId, {
      parentMessageId: rootMessageId,
      messageType: input.messageType ?? 'RICH_TEXT',
      content: input.content,
      attachmentIds: input.attachmentIds,
    });
  }

  async lock(rootMessageId: string) {
    await threadRepo.lock(rootMessageId);
  }

  async unlock(rootMessageId: string) {
    await threadRepo.unlock(rootMessageId);
  }

  async getSummary(rootMessageId: string) {
    const thread = await threadRepo.findByRootMessage(rootMessageId);
    if (!thread) throw AppError.notFound('Thread');
    return { summary: thread.summary, status: thread.summary ? 'available' : 'not_available' };
  }
}

export const threadService = new ThreadService();
