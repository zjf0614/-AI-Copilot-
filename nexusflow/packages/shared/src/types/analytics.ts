/**
 * 模块 H：分析 & BI 类型定义
 *
 * ## 核心功能
 * - **仪表盘 (Dashboard)**：可定制的数据可视化面板，支持多种面板类型
 * - **OKR**：目标与关键结果管理，支持层级结构和自动进度计算
 * - **分析事件 (AnalyticsEvent)**：用户行为事件采集和查询
 */

/** 仪表盘 */
export interface Dashboard {
  id: string; workspaceId: string; name: string;
  description: string | null;
  /** 面板列表 */
  panels: DashboardPanel[];
  /** 面板布局配置 */
  layout: Record<string, unknown>;
  isDefault: boolean; createdBy: string;
  createdAt: string; updatedAt: string;
}

/** 仪表盘面板 — 支持图表、表格、指标、文本四种类型 */
export interface DashboardPanel {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  /** 数据查询配置 */
  query: object;
  /** 面板在网格中的位置 */
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

/** OKR 目标 */
export interface OkrObjective {
  id: string; workspaceId: string; userId: string;
  title: string; description: string | null;
  /** 季度标识（如 '2026Q1'） */
  quarter: string;
  /** 整体进度百分比 (0-100) */
  progress: number;
  parentId: string | null;
  keyResults?: OkrKeyResult[];
  createdAt: string; updatedAt: string;
}

/** OKR 关键结果 — 可量化的子目标 */
export interface OkrKeyResult {
  id: string; objectiveId: string; title: string;
  /** 目标值 */
  targetValue: number;
  /** 当前值 */
  currentValue: number;
  /** 单位（如 %, 次, 元） */
  unit: string;
  /** 进度百分比 = min(100, currentValue/targetValue * 100) */
  progress: number;
  completedAt: string | null;
  createdAt: string; updatedAt: string;
}

/** 分析事件 — 用户行为追踪 */
export interface AnalyticsEvent {
  id: string; workspaceId: string;
  /** 事件类型（如 'user.login', 'message.sent'） */
  eventType: string;
  userId: string | null;
  resourceType: string | null; resourceId: string | null;
  /** 事件附加属性（JSON） */
  properties: Record<string, unknown>;
  createdAt: string;
}

export interface CreateDashboardInput {
  name: string; description?: string;
  panels?: DashboardPanel[]; layout?: Record<string, unknown>;
}

export interface CreateOkrInput {
  title: string; description?: string; quarter: string;
  parentId?: string;
  keyResults?: { title: string; targetValue: number; unit: string }[];
}
