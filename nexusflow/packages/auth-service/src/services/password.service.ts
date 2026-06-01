/**
 * 密码服务：哈希、验证、强度校验
 *
 * ## 算法选择：Argon2id
 * Argon2 是 2015 年 Password Hashing Competition 的获胜算法，
 * 相比 bcrypt/scrypt 有以下优势：
 * - **抗 GPU 攻击**：内置 memory-hard 参数，GPU 显存瓶颈限制并行破解
 * - **三合一模式**：Argon2id 混合 Argon2i（抗侧信道）和 Argon2d（抗 GPU）
 * - **可调参数**：memoryCost、timeCost、parallelism 可根据硬件调整
 *
 * ## 参数配置
 * ```
 * memoryCost:  65536 KB (64 MB) — OWASP 推荐的 minimum 为 46 MB
 * timeCost:    3 次迭代       — 在性能和安全性之间平衡（~100ms/hash）
 * parallelism: 4 线程          — 匹配 4 核 CPU
 * ```
 *
 * ## 密码策略
 * validatePasswordStrength 支持可配置的策略：
 * - minLength：最小长度（默认 8）
 * - requireUppercase：必须包含大写字母
 * - requireLowercase：必须包含小写字母
 * - requireNumbers：必须包含数字
 * - requireSpecialChars：必须包含特殊字符
 */

import argon2 from 'argon2';

/**
 * Argon2id 哈希参数
 *
 * 为什么选择这些值：
 * - 64 MB memory：阻止 GPU 大规模并行破解（GPU 显存限制）
 * - 3 次迭代：约 100ms 的单次哈希时间，用户体验可接受
 * - 4 并行度：适合 4 核机器，同时保持一定抗并行能力
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id, // 混合模式：i 抗侧信道 + d 抗 GPU
  memoryCost: 65536,     // 64 MB（单位 KiB）
  timeCost: 3,           // 3 轮迭代
  parallelism: 4,        // 4 条并行 lane
};

/**
 * 对明文密码进行 Argon2id 哈希
 *
 * argon2 自动生成随机 salt（内嵌在哈希字符串中），
 * 因此每次调用即使对相同密码也会产生不同的哈希值。
 * 哈希格式包含所有参数：`$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>`
 *
 * @param password - 明文密码
 * @returns Argon2id 哈希字符串（含算法参数和 salt）
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * 验证明文密码是否匹配已存储的哈希
 *
 * argon2.verify 从哈希字符串中提取 salt 和参数，
 * 用相同参数重新计算哈希并比对，防止 timing attack。
 *
 * @param hash - 存储的 Argon2id 哈希字符串
 * @param password - 待验证的明文密码
 * @returns 密码是否匹配；异常（格式错误等）时返回 false
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // hash 格式不正确或参数无效 → 安全返回 false（不泄露原因）
    return false;
  }
}

/**
 * 密码强度校验
 *
 * 返回结构化的校验结果而非抛异常，方便返回所有不合规项给前端展示。
 *
 * ## 策略设计
 * 所有策略项默认为 false（不要求），Workspace 管理员可逐项开启。
 * 这允许每个 Workspace 自定义密码复杂度要求。
 *
 * @param password - 待校验的明文密码
 * @param policy - 可选的密码策略配置（来自 Workspace 设置）
 * @returns `{ valid: boolean, errors: string[] }` — 是否通过及所有不合规项
 */
export function validatePasswordStrength(
  password: string,
  policy?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 最小长度：默认 8，可由 workspace policy 覆盖
  const minLength = policy?.minLength ?? 8;

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }

  // 大写字母检查：[A-Z]，仅当策略要求时
  if (policy?.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // 小写字母检查：[a-z]，仅当策略要求时
  if (policy?.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // 数字检查：\d，仅当策略要求时
  if (policy?.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // 特殊字符检查：常见特殊字符集，仅当策略要求时
  if (policy?.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // valid = 无校验错误
  return { valid: errors.length === 0, errors };
}
