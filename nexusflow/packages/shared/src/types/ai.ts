/**
 * 模块 F：AI Copilot 类型定义
 *
 * ## 核心概念
 * - **对话 (Conversation)**：用户与 AI 的多轮对话，支持绑定上下文
 * - **消息 (AiMessage)**：单条对话消息，包含角色(role)、内容、Token 用量、引用
 * - **知识库 (KnowledgeBase)**：上传文档作为 AI 参考素材
 * - **引用 (AiCitation)**：AI 回答中引用的来源（文档片段/消息/URL）
 *
 * ## 上下文绑定
 * 对话可绑定到特定上下文资源：
 * - `contextType: 'document'` + `contextId` → 针对特定文档提问
 * - `contextType: 'channel'` + `contextId` → 针对特定频道内容提问
 */

export interface AiConversation {
  id: string;
  workspaceId: string;
  userId: string;
  title: string | null;
  /** 使用的 AI 模型，如 'claude-sonnet-4-6' */
  model: string;
  /** 上下文类型（document/channel/project） */
  contextType: string | null;
  /** 上下文资源 ID */
  contextId: string | null;
  messages?: AiMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  /** 消息角色：user / assistant / system */
  role: string;
  content: string;
  /** Token 用量（用于计费和监控） */
  tokens: number | null;
  /** AI 回答中引用的来源 */
  citations: AiCitation[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** AI 引用 — 回答中引用的来源信息 */
export interface AiCitation {
  documentId?: string;
  messageId?: string;
  url?: string;
  title?: string;
  snippet?: string;
}

export interface KnowledgeBase {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  sources: string[];
  /** 使用的嵌入模型（如 'text-embedding-3-large'） */
  embeddingModel: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationInput {
  title?: string;
  model?: string;
  contextType?: string;
  contextId?: string;
}

export interface SendAiMessageInput {
  content: string;
}
