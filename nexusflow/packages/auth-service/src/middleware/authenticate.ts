/**
 * JWT 认证中间件（Fastify preHandler 钩子）
 *
 * ## 工作流程
 * 1. 检查 Authorization header 是否存在
 * 2. 验证 Bearer 格式（`Bearer <token>`）
 * 3. 提取 token 并用公钥验证签名和过期时间
 * 4. 将解析后的 payload 挂载到 `request.user`
 * 5. 下游处理器和中间件通过 `request.user` 获取用户信息
 *
 * ## 请求生命周期
 * ```
 * Request → authenticate → requireMfa? → authorize? → handler
 *          └── 解析 JWT            └── 检查 MFA    └── 检查权限
 * ```
 *
 * ## Fastify 类型扩展
 * 通过 `declare module 'fastify'` 扩展了 Request 接口，
 * 添加 `user` 属性，使 TypeScript 知道 `request.user` 的类型。
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError, ErrorCode } from '@nexusflow/shared';
import { verifyAccessToken, type AccessTokenPayload } from '../services/jwt.service.js';

// 扩展 FastifyRequest 类型，添加 user 属性
declare module 'fastify' {
  interface FastifyRequest {
    /** 从 Access Token 解析出的用户信息 */
    user: AccessTokenPayload;
  }
}

/**
 * 认证中间件
 *
 * 用法：
 * ```ts
 * app.get('/protected', { preHandler: [authenticate] }, async (req, reply) => {
 *   // req.user 已可用
 * });
 * ```
 *
 * @throws AppError(401) - 无 token / 格式错误 / token 过期 / 签名无效
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  // 1. 检查 Authorization header 是否存在
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
  }

  // 2. 验证 Bearer 格式
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Malformed authorization header', 401);
  }

  // 3. 提取 token 字符串
  const token = parts[1]!;

  // 4. 验证签名、过期时间和 issuer
  try {
    const payload = verifyAccessToken(token);
    // 5. 挂载到 request，下游可直接使用
    request.user = payload;
  } catch (err: any) {
    // 区分 token 过期和签名无效，返回不同错误码
    if (err.name === 'TokenExpiredError') {
      throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Access token has expired', 401);
    }
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid access token', 401);
  }
}
