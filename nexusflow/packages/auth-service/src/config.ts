/**
 * auth-service 环境配置
 *
 * ## 配置来源（优先级从高到低）
 * 1. 环境变量 (process.env) — 生产环境由 Docker/K8s 注入
 * 2. 文件加载 (如 JWT_PRIVATE_KEY_PATH → readFileSync) — 密钥文件
 * 3. 硬编码默认值 — 仅开发环境使用，生产必须覆盖
 *
 * ## 安全关键配置
 * - `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`：RS256 密钥对
 *   开发环境用默认键（不安全），生产必须通过文件路径加载
 * - `ENCRYPTION_KEY`：AES-256 加密密钥
 *   必须 64 hex 字符（32 字节），开发默认值不安全
 * - `JWT_ACCESS_EXPIRES_SECONDS`：Access Token 过期时间
 *   默认 15 分钟，平衡安全性和用户体验
 */

import { readFileSync } from 'node:fs';

export const config = {
  // ─── 服务网络 ───
  /** auth-service 监听端口 */
  PORT: parseInt(process.env.AUTH_PORT ?? '3001', 10),
  /** 绑定地址（0.0.0.0 表示所有网络接口） */
  HOST: process.env.AUTH_HOST ?? '0.0.0.0',

  // ─── JWT ───
  /**
   * RS256 私钥（用于签名 JWT）
   * 优先从 JWT_PRIVATE_KEY_PATH 文件加载，否则使用开发默认值
   */
  JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY_PATH
    ? readFileSync(process.env.JWT_PRIVATE_KEY_PATH, 'utf8')
    : 'development-private-key-change-in-production',
  /**
   * RS256 公钥（用于验证 JWT）
   * 优先从 JWT_PUBLIC_KEY_PATH 文件加载，否则使用开发默认值
   */
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY_PATH
    ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8')
    : 'development-public-key-change-in-production',
  /** Token 签发者标识 */
  JWT_ISSUER: process.env.JWT_ISSUER ?? 'nexusflow',
  /** Access Token 有效期（秒），默认 15 分钟 */
  JWT_ACCESS_EXPIRES_SECONDS: parseInt(process.env.JWT_ACCESS_EXPIRES_SECONDS ?? '900', 10),
  /** Refresh Token 有效期（秒），默认 7 天 */
  JWT_REFRESH_EXPIRES_SECONDS: parseInt(process.env.JWT_REFRESH_EXPIRES_SECONDS ?? '604800', 10),

  // ─── 加密 ───
  /**
   * AES-256 加密密钥（64 hex = 32 bytes）
   * ⚠️ 生产环境必须通过环境变量注入
   */
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? '0000000000000000000000000000000000000000000000000000000000000000',

  // ─── Redis ───
  /** Redis 连接 URL（用于 Session/Cache/Rate Limiting） */
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  // ─── CORS ───
  /** 允许的 CORS 源（逗号分隔），默认前端开发地址 */
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),

  // ─── 速率限制 ───
  /** 每个 IP 在限流窗口内的最大请求数 */
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  /** 限流窗口大小（毫秒），默认 1 分钟 */
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),

  // ─── 日志 ───
  /** 日志级别 (trace/debug/info/warn/error/fatal) */
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  /** 运行环境 (development/production/test) */
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const; // as const 确保配置值不可变更
