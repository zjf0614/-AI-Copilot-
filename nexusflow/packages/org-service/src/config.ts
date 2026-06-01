/**
 * org-service 环境配置
 *
 * ## 服务职责
 * org-service 管理 NexusFlow 的核心组织数据：
 * - Workspace 管理（创建/更新/统计）
 * - 用户管理（查询/更新/禁用）
 * - 角色和权限管理（RBAC）
 * - 组织架构（部门/团队/虚拟组）
 * - 访客邀请和分享链接
 * - ABAC 策略管理
 * - 审计日志查询
 *
 * ## 注意
 * ENCRYPTION_KEY 必须与 auth-service 保持一致，
 * 因为 org-service 也需要读取加密的 SSO 配置。
 */

import { readFileSync } from 'node:fs';

export const config = {
  /** org-service 监听端口 */
  PORT: parseInt(process.env.ORG_PORT ?? '3002', 10),
  /** 绑定地址 */
  HOST: process.env.ORG_HOST ?? '0.0.0.0',

  /**
   * JWT 公钥 — 仅用于验证 Token，不签发
   * auth-service 签发 JWT（用私钥），org-service 验证 JWT（用公钥）
   */
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY_PATH
    ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8')
    : 'development-public-key-change-in-production',
  JWT_ISSUER: process.env.JWT_ISSUER ?? 'nexusflow',

  /** Redis 连接 URL（缓存 + Session） */
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  /** CORS 允许的源 */
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),

  /** ⚠️ 必须与 auth-service 相同的加密密钥 */
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? '0000000000000000000000000000000000000000000000000000000000000000',

  /** auth-service URL（SSO 配置管理时转发请求） */
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',

  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
