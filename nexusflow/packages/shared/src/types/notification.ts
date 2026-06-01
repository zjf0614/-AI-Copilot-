/**
 * 模块 G：通知 & 集成 类型定义
 *
 * ## 通知系统
 * - **Notification**：站内通知（@提及、评论、任务分配等）
 * - **NotificationPreference**：用户通知偏好（按渠道开关、免打扰时段）
 *
 * ## 第三方集成
 * - **Integration**：外部服务连接（GitHub、Jira、Slack 等）
 * - **WebhookSubscription**：事件驱动的 HTTP 回调
 */

/** 集成提供商 */
export type IntegrationProvider = 'GITHUB' | 'GITLAB' | 'JIRA' | 'SLACK' | 'TEAMS' | 'GOOGLE' | 'OFFICE365' | 'SALESFORCE' | 'ZAPIER';

/** 通知 */
export interface Notification {
  id: string; workspaceId: string; userId: string;
  title: string; body: string | null;
  /** 通知类型（mention/comment/assignment/system） */
  notificationType: string;
  resourceType: string | null; resourceId: string | null;
  isRead: boolean;
  /** 是否已通过外部渠道（推送/邮件）发送 */
  isSent: boolean;
  sentChannels: string[];
  createdAt: string;
}

/** 通知偏好 — 用户可按渠道自定义 */
export interface NotificationPreference {
  id: string; workspaceId: string; userId: string;
  /** 通知渠道（in_app/email/push/sms） */
  channel: string;
  enabled: boolean;
  /** 免打扰开始时间（HH:mm） */
  quietStart: string | null;
  /** 免打扰结束时间（HH:mm） */
  quietEnd: string | null;
  /** 关键词过滤 — 仅接收包含这些关键词的通知 */
  keywords: string[];
  createdAt: string; updatedAt: string;
}

/** 第三方集成 */
export interface Integration {
  id: string; workspaceId: string;
  provider: IntegrationProvider;
  name: string;
  isEnabled: boolean;
  lastSyncAt: string | null;
  createdAt: string; updatedAt: string;
}

/** Webhook 订阅 */
export interface WebhookSubscription {
  id: string; workspaceId: string;
  /** 回调 URL */
  url: string;
  /** 订阅的事件类型列表 */
  events: string[];
  /** Webhook 签名密钥 */
  secret: string;
  isActive: boolean;
  createdAt: string; updatedAt: string;
}

export interface UpdateNotificationPreferenceInput {
  channel: string; enabled?: boolean;
  quietStart?: string | null; quietEnd?: string | null;
  keywords?: string[];
}

export interface CreateWebhookInput {
  url: string; events: string[]; secret?: string;
}
