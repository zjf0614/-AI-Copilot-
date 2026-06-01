/**
 * 审计日志类型定义
 *
 * ## 审计日志的作用
 * - **合规 (Compliance)**：满足 SOC2/ISO27001/GDPR 等合规要求
 * - **安全分析**：追踪可疑行为（如多次权限检查拒绝）
 * - **变更回溯**：记录所有资源的创建/修改/删除操作
 *
 * ## 审计事件分类
 * - 用户操作：登录/登出/创建/更新/删除
 * - 角色操作：创建/更新/删除/分配/撤销
 * - 组织操作：部门/团队/虚拟组的 CRUD
 * - 访客操作：邀请/接受/撤销
 * - 安全操作：MFA 注册/禁用、SSO 配置、API Key 管理
 * - 策略操作：ABAC 策略的 CRUD
 *
 * ## Compliance Tags
 * 为每个审计事件添加合规标签（如 GDPR、HIPAA），
 * 方便按法规要求筛选导出审计报告。
 */

export type AuditActionType =
  | 'USER_LOGIN' | 'USER_LOGOUT' | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED'
  | 'ROLE_CREATED' | 'ROLE_UPDATED' | 'ROLE_DELETED' | 'ROLE_ASSIGNED' | 'ROLE_REVOKED'
  | 'WORKSPACE_CREATED' | 'WORKSPACE_UPDATED' | 'WORKSPACE_DELETED'
  | 'SSO_CONFIGURED' | 'SSO_REMOVED'
  | 'DEPARTMENT_CREATED' | 'DEPARTMENT_UPDATED' | 'DEPARTMENT_DELETED'
  | 'TEAM_CREATED' | 'TEAM_UPDATED' | 'TEAM_DELETED'
  | 'VGROUP_CREATED' | 'VGROUP_UPDATED' | 'VGROUP_DELETED'
  | 'MEMBER_ADDED' | 'MEMBER_REMOVED'
  | 'GUEST_INVITED' | 'GUEST_ACCEPTED' | 'GUEST_REVOKED'
  | 'SHARE_LINK_CREATED' | 'SHARE_LINK_REVOKED'
  | 'POLICY_CREATED' | 'POLICY_UPDATED' | 'POLICY_DELETED'
  | 'MFA_ENROLLED' | 'MFA_DISABLED'
  | 'PERMISSION_CHECK_DENIED'       // 权限检查被拒绝（安全敏感事件）
  | 'API_KEY_CREATED' | 'API_KEY_REVOKED'
  | 'SYSTEM_CONFIG_CHANGED';

/** 审计日志条目 */
export interface AuditLog {
  id: string;
  workspaceId: string;
  /** 操作执行者（null 表示系统操作） */
  actorId: string | null;
  actorEmail: string | null;
  action: AuditActionType;
  /** 被操作的资源类型 */
  resourceType: string;
  /** 被操作的资源 ID */
  resourceId: string | null;
  /** 操作详情（变更前后的值、变更字段等） */
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  /** 分布式追踪 ID，关联请求日志 */
  correlationId: string | null;
  /** 合规标签（如 ['GDPR', 'SOX']） */
  complianceTags: string[];
  createdAt: string;
}

export type ComplianceExportFormat = 'CSV' | 'JSON';

export interface AuditFilter {
  workspaceId: string;
  actorId?: string;
  action?: AuditActionType;
  resourceType?: string;
  resourceId?: string;
  /** 时间范围起始 */
  from?: string;
  /** 时间范围结束 */
  to?: string;
  complianceTags?: string[];
  /** 全文搜索 */
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
}

/** 审计统计 — 管理 Dashboard 使用 */
export interface AuditStats {
  totalEntries: number;
  actionsBreakdown: Record<string, number>;
  topActors: { actorId: string; actorEmail: string; count: number }[];
  dailyCounts: { date: string; count: number }[];
}
