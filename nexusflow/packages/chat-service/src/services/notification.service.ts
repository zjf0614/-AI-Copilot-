// Notification service stub — defers to future Notification module

import type { SendMessageInput } from '@nexusflow/shared';

export class NotificationService {
  async notifyMentions(message: { content: any; userId: string; channelId?: string; roomId?: string }) {
    const mentions: string[] = (message.content as any)?.mentions ?? [];
    if (mentions.length > 0) {
      // TODO: Send push/email/in-app notifications to mentioned users
      console.log(`[notifications] Message by ${message.userId} mentions: ${mentions.join(', ')}`);
    }
  }

  async notifyDm(roomId: string, fromUserId: string, toUserIds: string[]) {
    // TODO: Send notifications for new DM messages
    console.log(`[notifications] New DM in room ${roomId} from ${fromUserId} to ${toUserIds.join(', ')}`);
  }

  async notifyCall(inviteeIds: string[], callId: string, initiatorId: string) {
    // TODO: Send call notification
    console.log(`[notifications] Call ${callId} from ${initiatorId} to ${inviteeIds.join(', ')}`);
  }
}

export const notificationService = new NotificationService();
