/**
 * MFA 验证中间件 — 检查 token 是否包含 mfaVerified 声明
 *
 * ## 为什么需要这个中间件？
 * 某些敏感操作（如修改密码、删除 Workspace）需要用户已完成 MFA 验证。
 * Access Token 中有一个 `mfaVerified` flag，此中间件检查该 flag。
 *
 * ## Token 状态
 * - 密码登录成功后直接签发 → `mfaVerified: false`
 * - MFA 验证通过后重新签发 → `mfaVerified: true`
 * - Refresh Token 轮转 → 自动设为 `mfaVerified: true`（用户之前已通过 MFA）
 *
 * ## 路由保护模式
 * ```ts
 * // 普通受保护路由（仅需认证）
 * app.get('/profile', { preHandler: [authenticate] }, handler);
 *
 * // 敏感操作路由（需要 MFA）
 * app.post('/change-password', { preHandler: [authenticate, requireMfa] }, handler);
 * ```
 *
 * @throws AppError(401) - 未认证（request.user 不存在）
 * @throws AppError(403) - 已认证但未通过 MFA
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError, ErrorCode } from '@nexusflow/shared';

export async function requireMfa(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;

  // 理论不会发生（authenticate 先执行），但做防御性检查
  if (!user) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
  }

  // 检查 MFA 验证状态
  if (!user.mfaVerified) {
    throw new AppError(ErrorCode.MFA_REQUIRED, 'MFA verification required for this operation', 403);
  }
}
