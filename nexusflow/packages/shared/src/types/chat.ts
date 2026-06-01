/**
 * Chat 模块类型定义 — 模块 B：实时通讯
 *
 * ## 模块概述
 * Chat 模块是 NexusFlow 的实时通讯核心，包含：
 * - **频道 (Channel)**：群组对话，支持 PUBLIC/PRIVATE/ANNOUNCEMENT 三种类型
 * - **消息 (Message)**：支持富文本、代码块、文件附件、讨论串
 * - **私聊 (Direct Message)**：一对一或群组私聊
 * - **反应 (Reaction)**：Emoji 消息反应
 * - **已读回执 (Read Receipt)**：追踪消息阅读状态
 * - **通话 (Call)**：语音/视频/屏幕共享
 * - **归档 (Archive)**：消息保留策略和合规留存
 * - **搜索 (Search)**：全文搜索消息和频道
 *
 * ## 富文本块 (RichTextBlock)
 * 消息内容使用块（Block）模型，灵感来源于 Notion/Slack Block Kit。
 * 支持嵌套结构（如引用块中包含段落、列表项中包含代码块）。
 */

import type { PaginatedResponse } from './common.js';

// ─── 枚举类型 ──────────────────────────────────────────────

/** 频道类型 */
export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'ANNOUNCEMENT';

/** 消息类型 */
export type MessageType = 'TEXT' | 'RICH_TEXT' | 'CODE' | 'SYSTEM' | 'FILE' | 'CALL';

/** 私聊房间类型 */
export type RoomType = 'ONE_TO_ONE' | 'GROUP';

/** 频道成员角色 */
export type ChannelMemberRole = 'MEMBER' | 'ADMIN';

/** 通话类型 */
export type CallType = 'VOICE' | 'VIDEO' | 'SCREEN';

/** 通话状态 */
export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'DECLINED';

/** 归档策略类型 */
export type ArchivePolicyType = 'RETENTION' | 'AUTO_ARCHIVE' | 'LEGAL_HOLD';

/** 归档操作 */
export type ArchiveAction = 'DELETE' | 'ARCHIVE' | 'EXPORT';

// ─── 频道 ────────────────────────────────────────────

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  channelType: ChannelType;
  createdBy: string;
  topic: string | null;
  isArchived: boolean;
  isDeleted: boolean;
  settings: ChannelSettings;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelSettings {
  allowReactions?: boolean;
  allowThreads?: boolean;
  retentionDays?: number;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: ChannelMemberRole;
  lastReadAt: string | null;
  joinedAt: string;
  user?: { id: string; displayName: string; email: string; avatarUrl: string | null };
}

export interface CreateChannelInput {
  name: string;
  description?: string;
  channelType?: ChannelType;
  topic?: string;
  settings?: ChannelSettings;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string | null;
  topic?: string | null;
  settings?: ChannelSettings;
}

// ─── 消息 ────────────────────────────────────────────

/**
 * 消息内容 — 富文本 + 纯文本双轨制
 *
 * - text：纯文本版本（搜索、通知摘要）
 * - blocks：富文本块数组（渲染）
 * - mentions：被 @ 提及的用户 ID（通知用）
 * - links：消息中的链接列表
 */
export interface MessageContent {
  text: string;
  blocks?: RichTextBlock[];
  mentions?: string[];
  links?: string[];
}

/**
 * 富文本块 — 块级内容的基本单元
 *
 * 类型包括：段落、标题、代码、列表、引用、图片、视频、分隔线。
 * 支持通过 children 嵌套（如引用块包含段落）。
 */
export interface RichTextBlock {
  type: 'paragraph' | 'heading' | 'code' | 'list' | 'quote' | 'image' | 'video' | 'divider';
  level?: number;
  language?: string;
  ordered?: boolean;
  content?: string;
  url?: string;
  children?: RichTextBlock[];
}

/** 消息 — 核心数据模型 */
export interface Message {
  id: string;
  workspaceId: string;
  channelId: string | null;
  roomId: string | null;
  parentMessageId: string | null;
  userId: string;
  messageType: MessageType;
  content: MessageContent;
  metadata: Record<string, unknown>;
  isEdited: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; displayName: string; email: string; avatarUrl: string | null };
  reactions?: MessageReaction[];
  attachments?: Attachment[];
  replyCount?: number;
}

export interface SendMessageInput {
  channelId?: string;
  roomId?: string;
  parentMessageId?: string;
  messageType?: MessageType;
  content: MessageContent;
  attachmentIds?: string[];
}

export interface EditMessageInput {
  content?: MessageContent;
  messageType?: MessageType;
}

/**
 * 游标分页 — 适用于实时消息流
 *
 * 使用 before/after 游标而非 page/limit 偏移，
 * 新消息插入不影响已加载的页面。
 */
export interface CursorPagination {
  before?: string;
  after?: string;
  limit?: number;
}

// ─── 讨论串 ─────────────────────────────────────────────

export interface Thread {
  id: string;
  workspaceId: string;
  rootMessageId: string;
  replyCount: number;
  lastReplyAt: string;
  isLocked: boolean;
  summary: string | null;
  rootMessage?: Message;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadReplyInput {
  messageType?: MessageType;
  content: MessageContent;
  attachmentIds?: string[];
}

// ─── 反应 ──────────────────────────────────────────

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: { id: string; displayName: string };
  createdAt: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  reacted: boolean;
}

// ─── 已读回执 ──────────────────────────────────────

export interface ReadReceipt {
  id: string;
  userId: string;
  channelId: string | null;
  roomId: string | null;
  lastReadMessageId: string;
  lastReadAt: string;
}

export interface MarkReadInput {
  channelId?: string;
  roomId?: string;
  lastReadMessageId: string;
}

export interface UnreadCount {
  channelId?: string;
  roomId?: string;
  unreadCount: number;
  lastReadMessageId?: string;
}

// ─── 私聊 ────────────────────────────────────

export interface DirectMessageRoom {
  id: string;
  workspaceId: string;
  name: string | null;
  roomType: RoomType;
  createdBy: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  members?: DmRoomMember[];
  lastMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
}

export interface DmRoomMember {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: string;
  leftAt: string | null;
  user?: { id: string; displayName: string; email: string; avatarUrl: string | null };
}

export interface CreateDmRoomInput {
  userIds: string[];
  name?: string;
}

// ─── 附件 ────────────────────────────────────────

export interface Attachment {
  id: string;
  messageId: string;
  workspaceId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageKey: string;
  thumbnailKey: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface PresignedUploadInput {
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  attachmentId: string;
  storageKey: string;
}

// ─── 通话 ──────────────────────────────────────────────

export interface CallSession {
  id: string;
  workspaceId: string;
  initiatorId: string;
  channelId: string | null;
  roomId: string | null;
  callType: CallType;
  status: CallStatus;
  signalingData: Record<string, unknown>;
  participants: string[];
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateCallInput {
  callType: CallType;
  channelId?: string;
  roomId?: string;
  participantIds: string[];
}

// ─── 消息链接 ──────────────────────────────────────

export interface MessageLink {
  id: string;
  sourceMessageId: string;
  targetMessageId: string | null;
  targetResourceType: string;
  targetResourceId: string;
  previewData: UnfurlPreview;
  createdAt: string;
}

export interface UnfurlPreview {
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
  url: string;
  type: 'link' | 'message' | 'document' | 'task' | 'file';
}

// ─── 归档 ───────────────────────────────────────────

export interface ArchivePolicy {
  id: string;
  workspaceId: string;
  name: string;
  channelId: string | null;
  policyType: ArchivePolicyType;
  durationDays: number;
  action: ArchiveAction;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArchivePolicyInput {
  name: string;
  channelId?: string;
  policyType: ArchivePolicyType;
  durationDays: number;
  action: ArchiveAction;
}

export interface UpdateArchivePolicyInput {
  name?: string;
  durationDays?: number;
  action?: ArchiveAction;
  isEnabled?: boolean;
}

export interface ArchivedMessage {
  id: string;
  originalMessageId: string;
  workspaceId: string;
  channelId: string | null;
  roomId: string | null;
  messageType: MessageType;
  userId: string;
  content: MessageContent;
  metadata: Record<string, unknown>;
  attachments: Attachment[];
  originalCreatedAt: string;
  archivedAt: string;
  archivePolicyId: string | null;
}

export interface LegalHoldInput {
  userId?: string;
  channelId?: string;
  reason: string;
}

// ─── 在线状态 ──────────────────────────────────────────

export interface PresenceStatus {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastHeartbeat: string;
  deviceCount: number;
}

// ─── WebSocket ─────────────────────────────────────────

export interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  timestamp: string;
}

export interface WsSubscribePayload {
  channelIds?: string[];
  roomIds?: string[];
  workspaceId: string;
}

// ─── 搜索 ────────────────────────────────────────────

export interface MessageSearchQuery {
  q: string;
  channelId?: string;
  userId?: string;
  from?: string;
  to?: string;
  fileType?: string;
  page?: number;
  limit?: number;
}

export interface QuickSearchResult {
  messages: { id: string; text: string; channelId: string | null; channelName: string | null }[];
  channels: { id: string; name: string }[];
  users: { id: string; displayName: string; email: string }[];
}
