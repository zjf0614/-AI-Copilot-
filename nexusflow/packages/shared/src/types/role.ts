/**
 * 角色和权限类型定义
 *
 * ## RBAC 数据模型
 * - **Role**：角色定义，包含权限列表、优先级、继承关系
 * - **RoleAssignment**：用户-角色关联，可限定作用域（Workspace/Department/Team）
 * - **EffectivePermissions**：用户的实际有效权限（含作用域授权）
 *
 * ## 权限作用域 (Scope)
 * 角色可以限定作用域：
 * - WORKSPACE：全局权限（如 Owner、Admin）
 * - DEPARTMENT：仅对特定部门生效
 * - TEAM：仅对特定团队生效
 *
 * ## 权限继承
 * 角色可通过 `inheritsFrom` 继承另一个角色的权限，
 * 形成权限层级链。系统自动检测循环继承。
 */

/** 角色作用域类型 */
export type ScopeType = 'WORKSPACE' | 'DEPARTMENT' | 'TEAM';

/** 权限操作 — 所有可用的 resource:action 权限 */
export type PermissionAction =
  // 用户管理
  | 'user:read' | 'user:read:self' | 'user:write' | 'user:delete'
  // Workspace
  | 'workspace:read' | 'workspace:manage' | 'workspace:delete'
  // 角色
  | 'role:read' | 'role:manage' | 'role:assign'
  // 组织
  | 'org:read' | 'org:manage'
  // SSO
  | 'sso:read' | 'sso:manage'
  // 访客
  | 'guest:read' | 'guest:manage'
  // 审计
  | 'audit:read' | 'audit:export'
  // 策略
  | 'policy:read' | 'policy:manage'
  // API Key
  | 'apikey:read' | 'apikey:manage'
  // 通配符（全部权限）
  | '*:*';

export interface Role {
  id: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  /** 是否为系统预定义角色（不可删除/修改） */
  isSystem: boolean;
  /** 角色拥有的权限列表 */
  permissions: PermissionAction[];
  /** 继承自哪个角色（null 表示无继承） */
  inheritsFrom: string | null;
  /** 优先级 — 多角色时数值越高越优先 */
  priority: number;
  assignedUserCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** 用户-角色分配 */
export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName?: string;
  /** 作用域类型 */
  scopeType: ScopeType;
  /** 作用域实体 ID */
  scopeId: string | null;
  assignedBy: string | null;
  /** 分配过期时间（临时权限） */
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: PermissionAction[];
  inheritsFrom?: string;
  priority?: number;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: PermissionAction[];
  inheritsFrom?: string | null;
  priority?: number;
}

export interface AssignRoleInput {
  roleId: string;
  scopeType?: ScopeType;
  scopeId?: string;
  expiresAt?: string;
}

/** 用户的有效权限（合并所有角色 + 继承链） */
export interface EffectivePermissions {
  userId: string;
  workspaceId: string;
  /** 用户的所有角色名 */
  roles: string[];
  /** 用户的所有权限（已展开通配符和继承） */
  permissions: PermissionAction[];
  /** 按作用域细分的授权列表 */
  scopeGrants: ScopeGrant[];
}

/** 作用域授权 — 某个权限在特定范围内的授权 */
export interface ScopeGrant {
  permission: PermissionAction;
  scopeType: ScopeType;
  scopeId: string;
}
