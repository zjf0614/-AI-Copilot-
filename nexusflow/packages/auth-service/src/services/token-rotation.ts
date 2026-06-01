/**
 * Refresh Token 轮转（Rotation）+ 重用检测（Reuse Detection）
 *
 * ## 什么是 Refresh Token Rotation?
 * 每次使用 Refresh Token 获取新 Access Token 时：
 * 1. 旧 Refresh Token 被标记为已使用（revoked）
 * 2. 签发新的 Refresh Token
 * 3. 新旧 token 属于同一 family（通过 family UUID 关联）
 *
 * ## 为什么要轮转？
 * - **限制 token 泄露影响**：如果 Refresh Token 被窃取，窃取者使用后，
 *   合法用户下次使用时会被检测到（旧 token 已被撤销），触发 "reuse detection"
 * - **自动窃取检测**：系统可识别 token 被反复使用的行为模式，
 *   全部撤销该 family 的所有 token
 *
 * ## Token Family 机制
 * ```
 * 正常流程：
 *   Refresh Token 1 → [rotate] → Refresh Token 2 → [rotate] → Refresh Token 3
 *   (family: uuid-xxx)
 *
 * 窃取场景：
 *   攻击者使用 Token 1 → revoked, 签发 Token 2
 *   合法用户使用 Token 1 → 已被 revoked！→ REUSE_DETECTED
 *   → 整个 family 全部撤销，攻击者手中的 Token 2 也失效
 * ```
 *
 * ## 数据结构
 * Refresh Token 存储格式：
 * - `token`：原始字符串（base64url 编码的 48 随机字节）
 * - `family`：家族 UUID，同一起源的所有轮转 token 共享
 * - `revokedAt`：撤销时间，非 null 表示已使用
 * - `replacedBy`：指向替换此 token 的新 token ID
 */

import crypto from 'node:crypto';
import { refreshTokenRepo, prisma } from '@nexusflow/database';
import { config } from '../config.js';

/**
 * Token 对 — API 返回给客户端的 Access + Refresh Token
 */
export interface TokenPair {
  /** JWT Access Token（短期） */
  accessToken: string;
  /** Refresh Token 原始字符串（长期） */
  refreshToken: string;
  /** Access Token 过期时间（秒） */
  expiresIn: number;
}

/**
 * 创建新的 Token 对（登录时调用）
 *
 * 流程：
 * 1. 签发 Access Token（JWT）
 * 2. 生成 Refresh Token（48 字节随机 base64url）
 * 3. 生成 family UUID（用于后续轮转追踪）
 * 4. 将 Refresh Token 写入数据库（明文存储，生产环境建议哈希存储）
 * 5. 返回 TokenPair
 *
 * @param jwtService - JWT 服务模块引用（依赖注入避免循环引用）
 * @param userData - 用户身份信息
 * @param deviceInfo - 客户端 User-Agent（用于审计）
 * @param ipAddress - 客户端 IP（用于地理位置审计）
 * @returns TokenPair（access + refresh）
 */
export async function createTokenPair(
  jwtService: typeof import('./jwt.service.js'),
  userData: {
    sub: string;
    email: string;
    workspaceId: string;
    roles: string[];
    permissions: string[];
    mfaVerified: boolean;
  },
  deviceInfo?: string,
  ipAddress?: string,
): Promise<TokenPair> {
  // 1. 签发 Access Token（短期 JWT）
  const accessToken = jwtService.signAccessToken(userData);

  // 2. 生成 Refresh Token（48 字节 = 384 位随机熵）
  const refreshTokenRaw = crypto.randomBytes(48).toString('base64url');

  // 3. 生成 family UUID（后续轮转 token 共享此 family）
  const family = crypto.randomUUID();

  // 4. 持久化 Refresh Token 到数据库
  await refreshTokenRepo.create({
    userId: userData.sub,
    token: refreshTokenRaw,
    family,
    deviceInfo,
    ipAddress,
    expiresAt: new Date(Date.now() + config.JWT_REFRESH_EXPIRES_SECONDS * 1000),
  });

  return {
    accessToken,
    refreshToken: refreshTokenRaw, // 返回原始 token，用户需妥善保管
    expiresIn: config.JWT_ACCESS_EXPIRES_SECONDS,
  };
}

/**
 * 轮转 Refresh Token（刷新 Access Token 时调用）
 *
 * 核心逻辑：
 * 1. 查找旧 token 是否存在
 * 2. 检查是否过期
 * 3. **重用检测**：如果旧 token 已被 revoked（意味着已被别人用过）
 *    → 撤销整个 family！可能存在 token 窃取
 * 4. 撤销旧 token，创建新 token（同 family）
 * 5. 签发新的 Access Token
 *
 * @param jwtService - JWT 服务模块引用
 * @param oldRefreshToken - 客户端提供的旧 Refresh Token
 * @param permissionService - 权限服务（获取用户最新角色/权限）
 * @param ipAddress - 当前请求 IP
 * @returns TokenPair（成功）或 error 对象（失败）
 */
export async function rotateRefreshToken(
  jwtService: typeof import('./jwt.service.js'),
  oldRefreshToken: string,
  permissionService: { getEffectivePermissions: (userId: string, workspaceId: string) => Promise<{ roles: string[]; permissions: string[] }> },
  ipAddress?: string,
): Promise<TokenPair | { error: 'REUSE_DETECTED' | 'EXPIRED' | 'INVALID' }> {
  // 按 hash 查找旧 token
  const existing = await refreshTokenRepo.findByHash(oldRefreshToken);

  if (!existing) {
    return { error: 'INVALID' }; // token 不存在，可能已过期被清理
  }

  // 检查是否过期
  if (new Date() > existing.expiresAt) {
    return { error: 'EXPIRED' };
  }

  // ⚠️ 重用检测（Token Theft 防御核心）
  // 如果 token 已被 revoked，说明此 token 之前已被使用过
  // 合法用户不应该提供已使用的 token → 可能被窃取！
  if (existing.revokedAt) {
    // 撤销整个 family（攻击者正在使用同一 family 的 token）
    await refreshTokenRepo.revokeFamily(existing.family);
    return { error: 'REUSE_DETECTED' };
  }

  // 撤销当前 token（单次使用原则）
  await refreshTokenRepo.revokeToken(existing.id);

  // 创建新的 Refresh Token（同 family）
  const newRefreshTokenRaw = crypto.randomBytes(48).toString('base64url');
  const newRecord = await refreshTokenRepo.create({
    userId: existing.userId,
    token: newRefreshTokenRaw,
    family: existing.family, // 保持同一 family，维持轮转链
    ipAddress,
    expiresAt: new Date(Date.now() + config.JWT_REFRESH_EXPIRES_SECONDS * 1000),
  });

  // 链式关联：旧 token → 新 token
  await refreshTokenRepo.setReplacedBy(existing.id, newRecord.id);

  // 获取用户最新信息（角色/权限可能已变更）以签发新 Access Token
  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { id: true, email: true, workspaceId: true },
  });

  if (!user) {
    return { error: 'INVALID' }; // 用户已被删除
  }

  const effective = await permissionService.getEffectivePermissions(user.id, user.workspaceId);

  const accessToken = jwtService.signAccessToken({
    sub: user.id,
    email: user.email,
    workspaceId: user.workspaceId,
    roles: effective.roles,
    permissions: effective.permissions,
    mfaVerified: true, // 通过 refresh token 续期 → 之前已通过 MFA
  });

  return {
    accessToken,
    refreshToken: newRefreshTokenRaw,
    expiresIn: config.JWT_ACCESS_EXPIRES_SECONDS,
  };
}

/**
 * 撤销用户所有 Refresh Token（密码修改、账户锁定等场景）
 *
 * 遍历用户所有未撤销的 token 的 family，全部撤销。
 * 效果：该用户所有设备都会被强制重新登录。
 *
 * @param userId - 用户 ID
 */
export async function revokeUserTokens(userId: string): Promise<void> {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null }, // 只处理未撤销的
    select: { family: true },
  });

  for (const token of tokens) {
    await refreshTokenRepo.revokeFamily(token.family);
  }
}
