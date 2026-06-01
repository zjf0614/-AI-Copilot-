/**
 * AI 服务：对话管理、知识库、语义搜索
 *
 * ## 核心功能
 * - **AI 对话 (Conversations)**：用户与 AI 的多轮对话，支持上下文绑定
 * - **知识库 (Knowledge Bases)**：上传文档作为 AI 的参考素材
 * - **语义搜索 (Semantic Search)**：基于向量的文档检索（TODO: 接入向量数据库）
 *
 * ## 当前状态
 * ⚠️ 此服务目前为桩实现（stub）。AI 响应返回硬编码占位文本。
 * 生产环境需接入真实的 LLM API（如 Claude API / OpenAI）。
 *
 * ## 上下文绑定 (Context-based Query)
 * 用户可以针对特定资源发起 AI 查询：
 * - 文档：`contextType: 'document', contextId: doc-uuid`
 * - 频道：`contextType: 'channel', contextId: channel-uuid`
 * - 项目：`contextType: 'project', contextId: project-uuid`
 *
 * 系统自动查找或创建与该上下文关联的对话，
 * 保持对话历史与上下文的绑定关系。
 */

import { prisma } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';

export class AiService {
  // ==================== 对话管理 ====================

  /**
   * 创建新的 AI 对话
   *
   * @param workspaceId - Workspace ID
   * @param userId - 创建者 ID
   * @param data - 对话配置（标题、模型、上下文类型和 ID）
   */
  async createConversation(workspaceId: string, userId: string, data: { title?: string; model?: string; contextType?: string; contextId?: string }) {
    return (prisma as any).aiConversation.create({ data: { ...data, workspaceId, userId } });
  }

  /**
   * 列出用户的所有对话
   *
   * 按更新时间降序排列，包含消息数量统计。
   */
  async listConversations(workspaceId: string, userId: string) {
    return (prisma as any).aiConversation.findMany({
      where: { workspaceId, userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } }, // 消息计数（不加载全部消息）
    });
  }

  /**
   * 获取单个对话详情（含所有消息，按时间升序）
   */
  async getConversation(id: string) {
    const c = await (prisma as any).aiConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }, // 按发送时间升序展示
    });
    if (!c) throw AppError.notFound('Conversation', id);
    return c;
  }

  /**
   * 发送消息到对话并获取 AI 响应
   *
   * 流程：
   * 1. 保存用户消息到数据库
   * 2. 更新对话的 updatedAt（前端排序用）
   * 3. ⚠️ 生成 AI 响应（当前为桩 — 生产需替换为真实 LLM API 调用）
   *
   * @param conversationId - 对话 ID
   * @param role - 消息角色 ('user' | 'assistant')
   * @param content - 消息内容
   * @param tokens - 可选，模型返回的 token 用量
   */
  async sendMessage(conversationId: string, role: string, content: string, tokens?: number) {
    // 保存用户/系统消息
    await (prisma as any).aiMessage.create({ data: { conversationId, role, content, tokens } });

    // 更新对话时间戳
    await (prisma as any).aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // ⚠️ 桩实现：返回占位文本
    // TODO: 替换为真实的 LLM API 调用
    const aiMsg = await (prisma as any).aiMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: '[AI response stub — connect to LLM API in production]',
        tokens: 0,
      },
    });
    return aiMsg;
  }

  /** 删除对话及其所有消息 */
  async deleteConversation(id: string) {
    return (prisma as any).aiConversation.delete({ where: { id } });
  }

  // ==================== 上下文查询 ====================

  /**
   * 基于上下文资源的 AI 查询
   *
   * 用于 "向本文档提问" 或 "总结此频道" 等场景。
   * 系统自动查找或创建与指定资源绑定的对话。
   *
   * @param contextType - 上下文类型（document/channel/project）
   * @param contextId - 上下文资源 ID
   * @param query - 用户的查询文本
   */
  async queryContext(workspaceId: string, userId: string, contextType: string, contextId: string, query: string) {
    // 查找已有的上下文对话
    let conv = await (prisma as any).aiConversation.findFirst({
      where: { workspaceId, userId, contextType, contextId },
      orderBy: { updatedAt: 'desc' },
    });

    // 不存在则创建新对话
    if (!conv) {
      conv = await this.createConversation(workspaceId, userId, {
        title: `Context: ${contextType} ${contextId}`,
        contextType,
        contextId,
      });
    }

    // 发送用户消息并返回完整对话
    await this.sendMessage(conv.id, 'user', query);
    return this.getConversation(conv.id);
  }

  // ==================== 知识库 ====================

  /** 列出 Workspace 下所有知识库 */
  async listKnowledgeBases(workspaceId: string) {
    return (prisma as any).knowledgeBase.findMany({ where: { workspaceId } });
  }

  /**
   * 创建知识库
   *
   * @param data.name - 知识库名称
   * @param data.sources - 可选，初始数据源列表
   * @param data.embeddingModel - 可选，嵌入模型选择
   */
  async createKnowledgeBase(workspaceId: string, data: { name: string; description?: string; sources?: object[]; embeddingModel?: string }) {
    return (prisma as any).knowledgeBase.create({ data: { ...data, workspaceId } });
  }

  async updateKnowledgeBase(id: string, data: any) {
    return (prisma as any).knowledgeBase.update({ where: { id }, data });
  }

  async deleteKnowledgeBase(id: string) {
    return (prisma as any).knowledgeBase.delete({ where: { id } });
  }

  // ==================== 语义搜索 ====================

  /**
   * 语义搜索（桩实现）
   *
   * ⚠️ TODO: 接入向量数据库（如 Pinecone / Weaviate / pgvector）
   * 当前使用简单的文档标题匹配返回结果。
   *
   * @param query - 搜索查询
   * @param limit - 最多返回结果数（默认 10）
   */
  async semanticSearch(workspaceId: string, query: string, limit = 10) {
    // TODO: Integrate with vector DB / embeddings
    const docs = await (prisma as any).document.findMany({
      where: { workspaceId, isDeleted: false },
      select: { id: true, title: true, slug: true },
      take: limit,
    });
    return {
      query,
      results: docs.map((d: any) => ({
        id: d.id,
        title: d.title,
        type: 'document',
        score: 0.5, // 桩：固定分数，真实实现应为相似度
      })),
    };
  }
}

/** AiService 单例 */
export const aiService = new AiService();
