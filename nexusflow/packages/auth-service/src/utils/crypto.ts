/**
 * AES-256-GCM 加密/解密 + 令牌哈希（auth-service 封装层）
 *
 * ## 架构说明
 * 此文件是对 `@nexusflow/shared` 加密函数的薄封装，
 * 将 auth-service 的配置密钥注入到共享加密函数。
 *
 * ## 为什么需要这一层？
 * - **关注点分离**：共享包提供通用加密能力（接收参数），
 *   各服务注入自己的密钥配置
 * - **一键切换密钥**：只需修改 config，所有加密调用自动使用新密钥
 * - **import 简化**：本服务其他模块只需 import from `../utils/crypto.js`
 *
 * ## 数据流
 * ```
 * plaintext → encrypt(plaintext, config.ENCRYPTION_KEY) → "iv:authTag:ciphertext"
 * "iv:authTag:ciphertext" → decrypt(data, config.ENCRYPTION_KEY) → plaintext
 * ```
 *
 * ## 安全说明
 * - ENCRYPTION_KEY 必须为 64 位 hex 字符（32 字节）以满足 AES-256 要求
 * - 生产环境必须通过环境变量注入，默认值仅用于开发环境
 * - encrypt 每次使用随机 IV，相同明文产生不同密文
 */

import { encrypt as sharedEncrypt, decrypt as sharedDecrypt, generateSecureToken, hashToken } from '@nexusflow/shared';
import { config } from '../config.js';

/**
 * 加密明文（使用 auth-service 的加密密钥）
 *
 * @param plaintext - 待加密的明文字符串
 * @returns 加密后的字符串，格式: `iv:authTag:ciphertext`
 */
export function encrypt(plaintext: string): string {
  return sharedEncrypt(plaintext, config.ENCRYPTION_KEY);
}

/**
 * 解密密文（使用 auth-service 的加密密钥）
 *
 * @param encryptedData - encrypt() 产生的密文字符串
 * @returns 原始明文字符串
 * @throws {Error} 如果密文格式错误或 authTag 验证失败
 */
export function decrypt(encryptedData: string): string {
  return sharedDecrypt(encryptedData, config.ENCRYPTION_KEY);
}

// 透明转发共享包的令牌工具函数
export { generateSecureToken, hashToken };
