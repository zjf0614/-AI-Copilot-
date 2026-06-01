/**
 * 用户类型定义
 *
 * ## 用户状态生命周期
 * ```
 * PENDING → ACTIVE → INACTIVE / SUSPENDED
 *   (邀请注册)  (正常)    (停用)     (违规封禁)
 * ```
 *
 * ## 用户分类
 * - **普通用户**：isGuest=false，通过注册或 SSO 加入
 * - **访客用户**：isGuest=true，通过邀请链接加入，权限受限
 */

/** 用户状态枚举 */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

/** 用户完整信息（数据库模型映射） */
export interface User {
  id: string;
  workspaceId: string;
  email: string;
  /** 邮箱是否已验证 */
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  /** 是否为外部访客 */
  isGuest: boolean;
  /** SSO 配置 ID（SSO 用户关联的身份提供商） */
  ssoConfigId: string | null;
  /** SSO 提供商中的外部用户 ID */
  externalId: string | null;
  jobTitle: string | null;
  location: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 用户个人资料（含 Workspace 和角色信息） */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  location: string | null;
  workspaceId: string;
  workspaceName: string;
  /** 用户在 Workspace 中的角色列表 */
  roles: string[];
  /** 用户在 Workspace 中的权限列表 */
  permissions: string[];
}

/** 创建用户输入（供 Repository 使用） */
export interface CreateUserInput {
  workspaceId: string;
  email: string;
  /** Argon2id 哈希后的密码（SSO 用户为 null） */
  passwordHash: string | null;
  displayName: string;
  isGuest?: boolean;
  ssoConfigId?: string;
  externalId?: string;
}

/** 更新用户输入 */
export interface UpdateUserInput {
  displayName?: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  status?: UserStatus;
}
