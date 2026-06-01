import { reactionRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';

export class ReactionService {
  async toggle(messageId: string, userId: string, emoji: string) {
    const hasReacted = await reactionRepo.hasUserReacted(messageId, userId, emoji);
    if (hasReacted) {
      await reactionRepo.remove(messageId, userId, emoji);
      return { action: 'removed' as const, emoji };
    }
    await reactionRepo.add(messageId, userId, emoji);
    return { action: 'added' as const, emoji };
  }

  async list(messageId: string) {
    return reactionRepo.listByMessage(messageId);
  }

  async counts(messageId: string) {
    return reactionRepo.countByMessage(messageId);
  }
}

export const reactionService = new ReactionService();
