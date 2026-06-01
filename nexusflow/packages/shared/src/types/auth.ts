/**
 * 认证相关类型：登录、注册、Token、MFA
 *
 * ## Token 类型说明
 * - **TokenPair**：客户端收到的 AccessToken + RefreshToken
 * - **TokenPayload**：JWT 中的声明（claims），解析后挂载到 request.user
 * - **SessionInfo**：数据库会话记录，用于管理多设备登录
 *
 * ## MFA 流程类型
 * 1. POST /auth/mfa/enroll → MfaEnrollResponse（返回密钥 + QR Code）
 * 2. POST /auth/mfa/verify → 验证通过，返回 backupCodes
 * 3. POST /auth/mfa/challenge → MfaChallengeRequest（日常登录时的 MFA 挑战）
 */

/** 登录请求 */
export interface LoginRequest {
  email: string;
  password: string;
  /** Workspace 唯一标识（slug），用于确定用户所属组织 */
  workspaceSlug: string;
}

/** 注册请求 — 同时创建 Workspace + Owner 用户 */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  /** Workspace 唯一标识符（URL 友好） */
  workspaceSlug: string;
  /** Workspace 显示名称 */
  workspaceName: string;
}

/** Token 对 — 登录/注册/刷新后返回给客户端 */
export interface TokenPair {
  /** JWT Access Token（短期，默认 15 分钟） */
  accessToken: string;
  /** Refresh Token（长期，默认 7 天，支持轮转） */
  refreshToken: string;
  /** Access Token 过期时间（秒） */
  expiresIn: number;
}

/** JWT Token 负载 — Access Token 中包含的所有声明 */
export interface TokenPayload {
  /** Subject — 用户 ID */
  sub: string;
  email: string;
  /** 当前 Workspace ID */
  workspaceId: string;
  /** 用户角色列表 */
  roles: string[];
  /** 用户权限列表（已展开 *:* 通配符） */
  permissions: string[];
  /** 是否已通过 MFA 两步验证 */
  mfaVerified: boolean;
  /** Issued At — 签发时间（Unix 时间戳） */
  iat: number;
  /** Expiration — 过期时间（Unix 时间戳） */
  exp: number;
  /** JWT ID — Token 唯一标识，用于防重放 */
  jti: string;
}

/** MFA 注册请求 — 用户输入 6 位 TOTP 验证码完成注册 */
export interface MfaEnrollRequest {
  totpCode: string;
}

/** MFA 注册响应 — 一次性返回密钥和恢复码 */
export interface MfaEnrollResponse {
  /** TOTP 共享密钥（Base32） */
  secret: string;
  /** Google Authenticator 兼容的 QR Code URI */
  qrCodeUri: string;
  /** 备用恢复码（一次性使用，请用户妥善保存） */
  backupCodes: string[];
}

/** MFA 挑战请求 — 密码登录后需完成 MFA 验证 */
export interface MfaChallengeRequest {
  /** 密码登录成功时返回的 MFA Challenge Token */
  mfaToken: string;
  /** 用户输入的 6 位 TOTP 验证码 */
  totpCode: string;
}

/** 修改密码请求 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** 忘记密码请求 — 发送重置邮件 */
export interface ForgotPasswordRequest {
  email: string;
  workspaceSlug: string;
}

/** 密码重置请求 — 使用邮件中的重置 token */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/** 会话信息 — 管理用户的多设备登录 */
export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  mfaVerified: boolean;
  createdAt: string;
  expiresAt: string;
  /** 是否为当前请求的会话 */
  isCurrent: boolean;
}
