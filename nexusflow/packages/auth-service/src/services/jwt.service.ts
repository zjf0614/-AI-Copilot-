/**
 * JWT 服务：签名、验证、解码 Token
 *
 * ## Token 类型
 * 本项目使用两种 JWT：
 *
 * ### Access Token
 * - **用途**：身份认证，每次 API 请求携带在 Authorization header 中
 * - **有效期**：短（默认 15 分钟 = 900 秒），减少被盗后影响窗口
 * - **签名算法**：RS256（RSA 非对称加密，私钥签名，公钥验证）
 * - **负载 (Payload)**：sub, email, workspaceId, roles, permissions, mfaVerified, jti
 *
 * ### MFA Challenge Token
 * - **用途**：用于 MFA 两步验证的中间状态
 * - **有效期**：5 分钟（300 秒），足够用户输入 6 位验证码
 * - **负载**：sub, workspaceId, mfaRequired flag
 *
 * ## 非对称加密 (RS256) 的优势
 * - 私钥仅 auth-service 持有（签名），公钥可分发到其他服务（验证）
 * - 其他微服务只需公钥即可独立验证 token，无需调用 auth-service
 * - 私钥泄露后只需换密钥对，不影响已签发的旧 token（旧公钥仍可用）
 */

import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config.js';

/**
 * Access Token 负载接口
 *
 * 定义了 Access Token 中包含的所有声明（claims）。
 * Fastify 中间件将解析后的 payload 挂载到 request.user。
 */
export interface AccessTokenPayload {
  /** 用户 ID (Subject) */
  sub: string;
  /** 用户邮箱 */
  email: string;
  /** 当前 Workspace ID */
  workspaceId: string;
  /** 用户角色列表 */
  roles: string[];
  /** 用户权限列表（已展开通配符 *:*） */
  permissions: string[];
  /** 是否已通过 MFA 验证 */
  mfaVerified: boolean;
  /** 签发时间 (Issued At)，Unix 时间戳 */
  iat: number;
  /** 过期时间 (Expiration)，Unix 时间戳 */
  exp: number;
  /** Token 唯一 ID (JWT ID)，用于撤销检测 */
  jti: string;
}

/**
 * 签发 Access Token
 *
 * 过程：
 * 1. 生成随机 jti（UUID v4），用于防重放跟踪
 * 2. 用 RS256 算法 + 私钥签名
 * 3. 设置过期时间 = JWT_ACCESS_EXPIRES_SECONDS
 * 4. 设置签发者 (issuer) = `nexusflow`
 *
 * @param payload - Token 负载数据（不含 iat/exp/jti，由 jwt.sign 自动生成）
 * @returns 签名的 JWT 字符串
 */
export function signAccessToken(payload: {
  sub: string;
  email: string;
  workspaceId: string;
  roles: string[];
  permissions: string[];
  mfaVerified: boolean;
}): string {
  return jwt.sign(
    {
      ...payload,
      jti: crypto.randomUUID(), // 每次签发都有唯一 ID，支持按 jti 撤销
    },
    config.JWT_PRIVATE_KEY, // RSA 私钥（从文件或环境变量加载）
    {
      algorithm: 'RS256',                         // RSA SHA-256 签名
      expiresIn: config.JWT_ACCESS_EXPIRES_SECONDS, // 短期有效
      issuer: config.JWT_ISSUER,                   // 签发者标识
    },
  );
}

/**
 * 验证并解析 Access Token
 *
 * jwt.verify 会：
 * 1. 验证签名（用公钥）→ 防止伪造
 * 2. 验证过期时间 (exp) → 防止使用过期 token
 * 3. 验证签发者 (iss) → 防止跨 issuer 使用
 *
 * @param token - Authorization header 中提取的 Bearer token
 * @returns 解析后的 AccessTokenPayload
 * @throws TokenExpiredError - token 已过期
 * @throws JsonWebTokenError - 签名无效或格式错误
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.JWT_PUBLIC_KEY, {
    algorithms: ['RS256'],    // 仅接受 RS256 签名
    issuer: config.JWT_ISSUER, // 必须匹配签发者
  }) as AccessTokenPayload;
}

/**
 * 签发 MFA Challenge Token
 *
 * 在用户密码登录成功但需 MFA 验证时签发。
 * 有效期为 300 秒（5 分钟），足够输入 6 位 TOTP 验证码（30 秒一换）。
 *
 * @param userId - 用户 ID
 * @param workspaceId - Workspace ID
 * @returns 签名的 MFA Challenge Token
 */
export function signMfaChallengeToken(userId: string, workspaceId: string): string {
  return jwt.sign(
    {
      sub: userId,
      workspaceId,
      mfaRequired: true, // 标记为 MFA 中间状态
      jti: crypto.randomUUID(),
    },
    config.JWT_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn: 300, // 5 分钟（MFA 验证窗口）
      issuer: config.JWT_ISSUER,
    },
  );
}

/**
 * 验证 MFA Challenge Token
 *
 * @param token - MFA Challenge Token
 * @returns 包含 sub、workspaceId 和 mfaRequired 声明的对象
 * @throws TokenExpiredError | JsonWebTokenError
 */
export function verifyMfaChallengeToken(token: string): { sub: string; workspaceId: string; mfaRequired: boolean } {
  return jwt.verify(token, config.JWT_PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: config.JWT_ISSUER,
  }) as { sub: string; workspaceId: string; mfaRequired: boolean };
}

/**
 * 解码 Token（不验证签名）
 *
 * 仅用于调试或提取公开信息（如 sub/email），**不能用于认证**。
 * 不验证签名意味着任何人都可以伪造 payload，仅在非安全上下文使用。
 *
 * @param token - JWT 字符串
 * @returns 解码后的 payload，或 null（格式错误时）
 */
export function decodeToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.decode(token) as AccessTokenPayload;
  } catch {
    return null;
  }
}
