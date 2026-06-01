/**
 * 权限常量 & 全局权限表
 *
 * ## RBAC 权限系统概述
 * NexusFlow 使用基于角色的访问控制（RBAC），每个角色包含一组权限。
 * 权限采用 `resource:action` 格式命名，如 `user:read`、`channel:manage`。
 *
 * ## 权限粒度设计
 * - **CRUD 基本权限**：read / write / delete / manage（manage 包含所有 CRUD）
 * - **资源级权限**：针对不同领域（user, workspace, role, channel 等）
 * - **自管理权限**：`user:read:self` 允许用户读取自己的信息（最小权限原则）
 * - **合规权限**：`compliance:*` 用于审计和合规导出
 * - **通配符权限**：`*:*` 授予所有权限（仅 Owner 角色使用）
 *
 * ## 权限继承
 * 角色可通过 `inheritsFrom` 继承其他角色的权限，形成权限层级。
 * Owner(*:*) → Admin(大部分管理权限) → Member(读权限) → Viewer(只读) → Guest(最小权限)
 */

/** 所有权限常量的字典对象，便于代码中引用 */
export const PERMISSIONS = {
  // ─── 用户管理 ───
  /** 读取所有用户信息 */
  USER_READ: 'user:read',
  /** 读取自己的用户信息（最小权限场景：Guest 只能看自己） */
  USER_READ_SELF: 'user:read:self',
  /** 创建/编辑用户 */
  USER_WRITE: 'user:write',
  /** 删除用户 */
  USER_DELETE: 'user:delete',

  // ─── Workspace 管理 ───
  /** 查看 Workspace 信息 */
  WORKSPACE_READ: 'workspace:read',
  /** 管理 Workspace 设置（名称、计划等） */
  WORKSPACE_MANAGE: 'workspace:manage',
  /** 删除 Workspace（不可逆操作） */
  WORKSPACE_DELETE: 'workspace:delete',

  // ─── 角色管理 ───
  /** 查看角色列表和权限 */
  ROLE_READ: 'role:read',
  /** 创建/编辑/删除自定义角色 */
  ROLE_MANAGE: 'role:manage',
  /** 为用户分配/移除角色 */
  ROLE_ASSIGN: 'role:assign',

  // ─── 组织管理 ───
  /** 查看组织架构（部门、团队） */
  ORG_READ: 'org:read',
  /** 管理组织架构 */
  ORG_MANAGE: 'org:manage',

  // ─── SSO 管理 ───
  /** 查看 SSO 配置 */
  SSO_READ: 'sso:read',
  /** 管理 SSO 配置 */
  SSO_MANAGE: 'sso:manage',

  // ─── 访客管理 ───
  /** 查看访客列表/邀请 */
  GUEST_READ: 'guest:read',
  /** 邀请/管理/移除访客 */
  GUEST_MANAGE: 'guest:manage',

  // ─── 审计日志 ───
  /** 查看审计日志 */
  AUDIT_READ: 'audit:read',
  /** 导出审计日志（合规需求） */
  AUDIT_EXPORT: 'audit:export',

  // ─── ABAC 策略 ───
  /** 查看访问策略 */
  POLICY_READ: 'policy:read',
  /** 管理访问策略 */
  POLICY_MANAGE: 'policy:manage',

  // ─── API Key ───
  /** 查看自己的 API Key */
  APIKEY_READ: 'apikey:read',
  /** 管理 API Key（创建/撤销） */
  APIKEY_MANAGE: 'apikey:manage',

  // ─── Chat — 频道 ───
  /** 查看频道和消息 */
  CHANNEL_READ: 'channel:read',
  /** 创建/管理/归档频道 */
  CHANNEL_MANAGE: 'channel:manage',
  /** 发送消息 */
  MESSAGE_SEND: 'message:send',
  /** 编辑/删除消息 */
  MESSAGE_MANAGE: 'message:manage',

  // ─── Chat — 私聊 ───
  /** 查看私聊消息 */
  DM_READ: 'dm:read',
  /** 管理私聊 */
  DM_MANAGE: 'dm:manage',

  // ─── Chat — 合规 ───
  /** 查看合规记录 */
  COMPLIANCE_READ: 'compliance:read',
  /** 管理合规设置 */
  COMPLIANCE_MANAGE: 'compliance:manage',
  /** 导出合规数据 */
  COMPLIANCE_EXPORT: 'compliance:export',

  // ─── 通配符 ───
  /** 所有权限的集合，仅 Owner 角色拥有 */
  WILDCARD: '*:*',
} as const; // as const 确保每个值被推断为字面量类型而非 string

/**
 * 所有权限的字符串数组
 * 用于遍历和权限检查中的通配符展开：当角色拥有 *:* 时，
 * 将其展开为此列表中的所有权限
 */
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS);

/** 权限字面量类型的联合类型 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
