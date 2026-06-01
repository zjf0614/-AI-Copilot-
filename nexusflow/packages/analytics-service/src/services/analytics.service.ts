/**
 * 分析服务：仪表盘、OKR、事件追踪、Workspace 洞察
 *
 * ## 核心功能
 * - **仪表盘 (Dashboards)**：可定制的数据可视化面板
 * - **OKR**：目标与关键结果管理（Objectives & Key Results）
 * - **事件追踪 (Analytics Events)**：用户行为事件采集和查询
 * - **Workspace 洞察 (Insights)**：聚合统计数据（用户数、消息数等）
 *
 * ## OKR 进度自动计算
 * `updateKeyResult` 在更新 currentValue 时自动计算 progress：
 * progress = min(100, (currentValue / targetValue) * 100)
 */

import { prisma } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';

export class AnalyticsService {
  // ==================== 仪表盘 ====================

  async createDashboard(workspaceId: string, createdBy: string, data: { name: string; description?: string; panels?: any[]; layout?: any }) {
    return (prisma as any).dashboard.create({ data: { ...data, workspaceId, createdBy } });
  }

  async listDashboards(workspaceId: string) {
    return (prisma as any).dashboard.findMany({ where: { workspaceId }, orderBy: { updatedAt: 'desc' } });
  }

  async getDashboard(id: string) {
    const d = await (prisma as any).dashboard.findUnique({ where: { id } });
    if (!d) throw AppError.notFound('Dashboard', id);
    return d;
  }

  async updateDashboard(id: string, data: any) {
    return (prisma as any).dashboard.update({ where: { id }, data });
  }

  async deleteDashboard(id: string) {
    return (prisma as any).dashboard.delete({ where: { id } });
  }

  // ==================== OKR ====================

  /**
   * 创建 OKR 目标
   *
   * 可同时创建关联的关键结果 (Key Results)。
   * KR 初始值: currentValue=0, progress=0。
   *
   * @param workspaceId - Workspace ID
   * @param userId - 目标负责人
   * @param data.title - 目标标题
   * @param data.quarter - 季度标识（如 '2026Q1'）
   * @param data.keyResults - 关键结果数组（{ title, targetValue, unit }）
   */
  async createObjective(workspaceId: string, userId: string, data: {
    title: string;
    description?: string;
    quarter: string;
    parentId?: string;
    keyResults?: { title: string; targetValue: number; unit: string }[];
  }) {
    const kr = data.keyResults || [];
    delete data.keyResults;
    return (prisma as any).okrObjective.create({
      data: {
        ...data,
        workspaceId,
        userId,
        // 同时创建 KR，初始值归零
        keyResults: { create: kr.map(k => ({ ...k, currentValue: 0, progress: 0 })) },
      },
      include: { keyResults: true },
    });
  }

  /** 列出 OKR，可按用户和季度筛选 */
  async listObjectives(workspaceId: string, userId?: string, quarter?: string) {
    const where: any = { workspaceId };
    if (userId) where.userId = userId;
    if (quarter) where.quarter = quarter;
    return (prisma as any).okrObjective.findMany({
      where,
      include: {
        keyResults: true,
        user: { select: { id: true, displayName: true } }, // 负责人信息
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateObjective(id: string, data: any) {
    return (prisma as any).okrObjective.update({ where: { id }, data });
  }

  /**
   * 更新关键结果进度
   *
   * 自动计算 progress 百分比：
   * progress = min(100, (currentValue / targetValue) * 100)
   *
   * @param data.currentValue - 当前值（更新后自动重算进度）
   */
  async updateKeyResult(id: string, data: { currentValue?: number; title?: string; targetValue?: number }) {
    const updates: any = { ...data };
    if (data.currentValue !== undefined) {
      // 获取当前的 targetValue，计算进度百分比
      const kr = await (prisma as any).okrKeyResult.findUnique({ where: { id } });
      if (kr) {
        updates.progress = Math.min(100, (data.currentValue / kr.targetValue) * 100);
      }
    }
    return (prisma as any).okrKeyResult.update({ where: { id }, data: updates });
  }

  // ==================== 事件追踪 ====================

  /**
   * 记录分析事件
   *
   * 用于用户行为分析和漏斗转化追踪。
   *
   * @param data.eventType - 事件类型标识（如 'user.login', 'message.sent'）
   * @param data.properties - 事件附加属性（JSON）
   */
  async trackEvent(workspaceId: string, data: { eventType: string; userId?: string; resourceType?: string; resourceId?: string; properties?: any }) {
    return (prisma as any).analyticsEvent.create({ data: { ...data, workspaceId } });
  }

  /**
   * 查询分析事件（分页 + 时间范围筛选）
   *
   * @param opts.from / opts.to - ISO datetime 字符串
   */
  async queryEvents(workspaceId: string, opts: { eventType?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const page = opts.page ?? 1;
    const limit = Math.min(100, opts.limit ?? 50);
    const where: any = { workspaceId };

    if (opts.eventType) where.eventType = opts.eventType;

    // 时间范围过滤
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }

    // 并行查询数据和总数
    const [data, total] = await Promise.all([
      (prisma as any).analyticsEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).analyticsEvent.count({ where }),
    ]);

    return { data, total };
  }

  // ==================== Workspace 洞察 ====================

  /**
   * 获取 Workspace 级别的聚合统计数据
   *
   * 所有查询并行执行（Promise.all），提升性能。
   * 统计项包括：活跃用户数、频道数、文档数、任务数、工作流数、总消息数。
   *
   * @returns 聚合统计结果 + 生成时间戳
   */
  async getWorkspaceInsights(workspaceId: string) {
    const [userCount, channelCount, docCount, taskCount, workflowCount, totalMessages] = await Promise.all([
      (prisma as any).user.count({ where: { workspaceId, status: 'ACTIVE' } }),
      (prisma as any).channel.count({ where: { workspaceId, isDeleted: false } }),
      (prisma as any).document.count({ where: { workspaceId, isDeleted: false } }),
      (prisma as any).task.count({ where: { workspaceId, isDeleted: false } }),
      (prisma as any).workflow.count({ where: { workspaceId } }),
      (prisma as any).message.count({ where: { workspaceId, isDeleted: false } }),
    ]);
    return {
      userCount,
      channelCount,
      docCount,
      taskCount,
      workflowCount,
      totalMessages,
      generatedAt: new Date().toISOString(),
    };
  }
}

/** AnalyticsService 单例 */
export const analyticsService = new AnalyticsService();
