/**
 * 访客和分享链接类型定义
 *
 * ## 访客 (Guest) 生命周期
 * ```
 * 管理员发送邀请 → PENDING → 访客点击链接接受 → ACCEPTED
 *                                └── 过期 ──────────→ EXPIRED
 *                                └── 管理员撤销 ────→ REVOKED
 * ```
 *
 * ## 分享链接 (Share Link)
 * 用于将资源（文档、频道等）安全地分享给外部用户。
 * 支持密码保护、访问次数限制、过期时间。
 */

/** 访客状态 */
export type GuestStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

/** 访客邀请 */
export interface GuestInvitation {
  id: string;
  workspaceId: string;
  inviterId: string;
  inviterName?: string;
  email: string;
  /** 访客被分配的角色 ID（权限模板） */
  roleId: string;
  roleName?: string;
  message: string | null;
  /** 唯一邀请 token（UUID） */
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  status: GuestStatus;
  createdAt: string;
  updatedAt: string;
}

/** 访客用户 — 管理面板中的访客摘要 */
export interface GuestUser {
  userId: string;
  email: string;
  displayName: string;
  invitationId: string;
  status: GuestStatus;
  roleName: string;
  invitedAt: string;
  acceptedAt: string | null;
}

/** 分享链接 */
export interface ShareLink {
  id: string;
  workspaceId: string;
  createdBy: string;
  creatorName?: string;
  /** 被分享的资源类型（document/channel） */
  resourceType: string;
  /** 被分享的资源 ID */
  resourceId: string;
  /** 唯一分享 token（URL 中使用） */
  token: string;
  /** 允许的操作权限 */
  permissions: string[];
  /** 是否有密码保护 */
  passwordProtected: boolean;
  /** 最大访问次数限制（null = 无限制） */
  maxAccesses: number | null;
  /** 当前访问次数 */
  accessCount: number;
  expiresAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export interface CreateGuestInvitationInput {
  email: string;
  roleId: string;
  message?: string;
  /** 邀请过期天数（默认 7） */
  expiresInDays?: number;
}

export interface CreateShareLinkInput {
  resourceType: string;
  resourceId: string;
  permissions?: string[];
  password?: string;
  maxAccesses?: number;
  expiresAt?: string;
}

/** 访客接受邀请的请求 */
export interface AcceptInvitationInput {
  invitationToken: string;
  displayName: string;
  password: string;
}
