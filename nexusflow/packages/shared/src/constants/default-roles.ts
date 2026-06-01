/**
 * 默认角色定义 — 每个 Workspace 创建时自动创建这些角色
 *
 * ## 角色层级（按 priority 降序）
 * ```
 * Owner   (100) — *:* 通配符，完全控制权
 * Admin   (80)  — 大部分管理权限，不含删除 workspace
 * Member  (50)  — 标准成员，读写自身数据
 * Viewer  (30)  — 只读访问
 * Guest   (10)  — 外部访客，最小权限
 * ```
 *
 * ## isSystem 标记
 * isSystem=true 的角色受保护（PROTECTED_ROLE_NAMES），
 * 不可被编辑或删除，确保每个 workspace 始终有基本角色可用。
 *
 * ## Priority（优先级）
 * 当用户拥有多个角色时，高优先级角色的权限优先。
 * priority 越高，角色越 "强大"。
 */

import { PERMISSIONS } from './permissions.js';

/** 默认角色定义的 TypeScript 接口 */
export interface DefaultRoleDefinition {
  name: string;
  /** 是否为系统角色（系统角色不可删除/修改） */
  isSystem: boolean;
  /** 该角色拥有的权限列表 */
  permissions: string[];
  /** 优先级 — 多角色时数值越高越优先 */
  priority: number;
  /** 人类可读的角色说明 */
  description: string;
}

/**
 * 默认角色字典
 * Key 为角色标识符，Value 为完整的角色定义。
 * Workspace 创建种子脚本使用 `Object.values(DEFAULT_ROLES)` 批量插入。
 */
export const DEFAULT_ROLES: Record<string, DefaultRoleDefinition> = {
  /** Owner — 拥有 *:* 通配符权限，永远不可删除 */
  OWNER: {
    name: 'Owner',
    isSystem: true,
    permissions: [PERMISSIONS.WILDCARD], // *:* 展开为所有已知权限
    priority: 100,
    description: 'Full workspace access. Cannot be removed or modified.',
  },
  /** Admin — 管理权限，但不含 billing 和 workspace 删除 */
  ADMIN: {
    name: 'Admin',
    isSystem: true,
    permissions: [
      PERMISSIONS.WORKSPACE_MANAGE,
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_READ_SELF,
      PERMISSIONS.USER_WRITE,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.ROLE_READ,
      PERMISSIONS.ROLE_MANAGE,
      PERMISSIONS.ROLE_ASSIGN,
      PERMISSIONS.ORG_READ,
      PERMISSIONS.ORG_MANAGE,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.AUDIT_EXPORT,
      PERMISSIONS.SSO_READ,
      PERMISSIONS.SSO_MANAGE,
      PERMISSIONS.GUEST_READ,
      PERMISSIONS.GUEST_MANAGE,
      PERMISSIONS.POLICY_READ,
      PERMISSIONS.POLICY_MANAGE,
      PERMISSIONS.APIKEY_READ,
      PERMISSIONS.APIKEY_MANAGE,
    ],
    priority: 80,
    description: 'Administrative access. Cannot manage billing or delete workspace.',
  },
  /** Member — 标准成员，可以读取大部分资源 */
  MEMBER: {
    name: 'Member',
    isSystem: true,
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.ORG_READ,
      PERMISSIONS.WORKSPACE_READ,
      PERMISSIONS.ROLE_READ,
      PERMISSIONS.GUEST_READ,
      PERMISSIONS.APIKEY_READ,
    ],
    priority: 50,
    description: 'Standard member with read access and self-management.',
  },
  /** Viewer — 只读角色，不能修改任何数据 */
  VIEWER: {
    name: 'Viewer',
    isSystem: true,
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.ORG_READ,
      PERMISSIONS.WORKSPACE_READ,
    ],
    priority: 30,
    description: 'Read-only access. Cannot modify any resources.',
  },
  /** Guest — 外部访客，仅能读取自己和组织架构基本信息 */
  GUEST: {
    name: 'Guest',
    isSystem: true,
    permissions: [
      PERMISSIONS.USER_READ_SELF, // 只能看自己的信息，不能看其他用户
      PERMISSIONS.ORG_READ,
    ],
    priority: 10,
    description: 'External guest with limited read access.',
  },
};

/**
 * 受保护角色名列表
 * 系统角色不可被编辑或删除，任何尝试修改 PROTECTED_ROLE_NAMES 中角色的操作将被拒绝。
 */
export const PROTECTED_ROLE_NAMES = Object.values(DEFAULT_ROLES).map(r => r.name);
