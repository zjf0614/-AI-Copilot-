import { prisma } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';

export class NotificationService {
  async list(workspaceId: string, userId: string, opts: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = opts.page ?? 1; const limit = Math.min(100, opts.limit ?? 50);
    const where: any = { workspaceId, userId }; if (opts.unreadOnly) where.isRead = false;
    const [data, total] = await Promise.all([(prisma as any).notification.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }), (prisma as any).notification.count({ where })]);
    return { data, total };
  }
  async markRead(id: string, userId: string) { return (prisma as any).notification.updateMany({ where: { id, userId }, data: { isRead: true } }); }
  async markAllRead(workspaceId: string, userId: string) { return (prisma as any).notification.updateMany({ where: { workspaceId, userId, isRead: false }, data: { isRead: true } }); }

  // Preferences
  async getPreferences(workspaceId: string, userId: string) { return (prisma as any).notificationPreference.findMany({ where: { workspaceId, userId } }); }
  async updatePreference(workspaceId: string, userId: string, data: { channel: string; enabled?: boolean; quietStart?: string; quietEnd?: string; keywords?: string[] }) {
    return (prisma as any).notificationPreference.upsert({ where: { workspaceId_userId_channel: { workspaceId, userId, channel: data.channel } }, create: { workspaceId, userId, ...data }, update: data });
  }

  // Integrations
  async listIntegrations(workspaceId: string) { return (prisma as any).integration.findMany({ where: { workspaceId } }); }
  async createIntegration(workspaceId: string, data: { provider: string; name: string; configEncrypted: string; isEnabled?: boolean }) { return (prisma as any).integration.create({ data: { ...data, workspaceId } }); }
  async updateIntegration(id: string, data: any) { return (prisma as any).integration.update({ where: { id }, data }); }
  async deleteIntegration(id: string) { return (prisma as any).integration.delete({ where: { id } }); }

  // Webhooks
  async listWebhooks(workspaceId: string) { return (prisma as any).webhookSubscription.findMany({ where: { workspaceId } }); }
  async createWebhook(workspaceId: string, data: { url: string; events: string[]; secret: string }) { return (prisma as any).webhookSubscription.create({ data: { ...data, workspaceId } }); }
  async deleteWebhook(id: string) { return (prisma as any).webhookSubscription.delete({ where: { id } }); }
}

export const notificationService = new NotificationService();
