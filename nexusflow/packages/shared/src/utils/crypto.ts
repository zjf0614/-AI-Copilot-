/**
 * AES-256-GCM 加密/解密工具（共享模块）
 *
 * ## 概述
 * 提供对称加密的基础能力，使用 AES-256-GCM 算法（Galois/Counter Mode）。
 * GCM 模式同时提供加密和认证（Auth Tag），可检测密文是否被篡改。
 *
 * ## 使用场景
 * - API Key 加密存储（加密后存入数据库，使用时解密）
 * - 敏感配置加密（如 SSO clientSecret）
 * - 令牌哈希（SHA-256）用于安全比对
 *
 * ## 数据结构
 * 加密后的格式为: `iv:authTag:ciphertext`
 * - iv: 12 字节随机初始化向量（hex 编码），确保相同明文每次产生不同密文
 * - authTag: 16 字节认证标签（hex 编码），用于解密时验证数据完整性
 * - ciphertext: 加密后的密文（hex 编码）
 */

import crypto from 'node:crypto';

// AES-256-GCM 算法标识符，256 位密钥，GCM 认证加密模式
const ALGORITHM = 'aes-256-gcm';

// 初始化向量长度：GCM 推荐 12 字节（96 位）
const IV_LENGTH = 12;

/**
 * 加密明文
 *
 * 流程：
 * 1. 将 hex 编码的密钥转为 Buffer（64 hex chars → 32 bytes）
 * 2. 生成随机初始化向量（每次加密都不同，保证语义安全）
 * 3. 创建 GCM 加密器
 * 4. 加密明文并收集 authTag
 * 5. 拼接 `iv:authTag:ciphertext` 作为最终密文
 *
 * @param plaintext - 待加密的明文字符串
 * @param encryptionKeyHex - 64 位 hex 字符密钥（对应 32 字节 AES-256）
 * @returns 加密后的字符串，格式: `iv:authTag:ciphertext`
 */
export function encrypt(plaintext: string, encryptionKeyHex: string): string {
  // 将 hex 密钥转换为 32 字节 Buffer（AES-256 要求 256 位 = 32 字节）
  const key = Buffer.from(encryptionKeyHex, 'hex');

  // 生成随机 IV，每次调用产生不同密文，防止模式识别攻击
  const iv = crypto.randomBytes(IV_LENGTH);

  // 创建 AES-256-GCM Cipher 对象
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // 加密：输入 utf8 明文，输出 hex 编码密文
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex'); // 结束加密，输出剩余的 hex 密文

  // 获取认证标签（16 字节），decrypt 时用于验证数据未被篡改
  const authTag = cipher.getAuthTag();

  // 返回拼接格式: iv:authTag:ciphertext，decrypt 时按此格式解析
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密密文
 *
 * 流程：
 * 1. 将 hex 密钥转为 Buffer
 * 2. 按 `:` 拆分 `iv:authTag:ciphertext`
 * 3. 创建 GCM 解密器，设置 authTag
 * 4. 解密密文并验证 authTag（不匹配则抛异常，说明数据被篡改或密钥错误）
 *
 * @param encryptedData - encrypt() 产生的密文字符串
 * @param encryptionKeyHex - 加密时使用的同一 hex 密钥
 * @returns 原始明文字符串
 * @throws {Error} 如果密文格式错误或 authTag 验证失败（密钥错误/数据损坏）
 */
export function decrypt(encryptedData: string, encryptionKeyHex: string): string {
  const key = Buffer.from(encryptionKeyHex, 'hex');

  // 拆分加密数据为三部分：iv、authTag、ciphertext
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  // 还原各组件为 Buffer
  const iv = Buffer.from(parts[0]!, 'hex');         // 初始化向量
  const authTag = Buffer.from(parts[1]!, 'hex');     // 认证标签
  const ciphertext = parts[2]!;                       // 密文（保持 hex 字符串）

  // 创建解密器，传入密钥和初始化向量
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  // 设置认证标签，解密时会自动验证——验证失败则抛异常
  decipher.setAuthTag(authTag);

  // 解密：输入 hex 密文，输出 utf8 明文
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8'); // 结束解密，输出剩余明文
  return decrypted;
}

/**
 * 生成安全的随机令牌
 *
 * 使用 Node.js crypto.randomBytes 生成加密安全的随机字节，
 * 编码为 hex 字符串（每字节 = 2 个 hex 字符）。
 *
 * @param length - 随机字节数，默认 32（生成 64 字符 hex 字符串）
 * @returns hex 编码的随机字符串
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 令牌哈希
 *
 * 使用 SHA-256 对令牌进行单向哈希。典型使用场景：
 * - 令牌明文发送给用户，哈希值存储数据库
 * - 验证时对用户提供的令牌再次哈希，比对数据库中的哈希值
 * - 即使数据库泄露，攻击者也无法还原原始令牌
 *
 * @param token - 需要哈希的令牌明文
 * @returns 64 字符的 hex 编码 SHA-256 哈希值
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
