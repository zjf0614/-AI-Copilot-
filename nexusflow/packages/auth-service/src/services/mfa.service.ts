/**
 * TOTP 基于时间的 Multi-Factor Authentication (MFA) 服务
 *
 * ## 什么是 TOTP？
 * TOTP (Time-based One-Time Password) 使用共享密钥 + 当前时间生成 6 位数字验证码。
 * 每 30 秒更换一次，实现 RFC 6238 标准。
 *
 * ## 工作流程
 * ```
 * 1. 注册 (enroll)
 *   生成密钥 → 加密存储 → 返回密钥和 QR code URI
 *   用户用 Google Authenticator / 1Password 扫描
 *
 * 2. 验证 (verify)
 *   用户输入 6 位 TOTP → 解密密钥 → 用 otplib 验证
 *   → 成功后生成 backup codes（10 个备用恢复码）
 *
 * 3. 日常挑战 (challenge)
 *   → 解密密钥 → 验证 TOTP → 返回是否通过
 *
 * 4. 备用码 (backup codes)
 *   用户丢失手机时使用备用码 → SHA-256 哈希存储
 *   → 每个码只能用一次
 * ```
 *
 * ## 安全设计
 * - 密钥 (secret) 使用 AES-256-GCM 加密后存入数据库
 * - Backup codes 使用 SHA-256 哈希存储（类似密码存储）
 * - 每个 backup code 一次性使用（verified 后从数组删除）
 * - 30 秒 TOTP 窗口限制了暴力破解的可行窗口
 */

import { authenticator } from 'otplib';
import crypto from 'node:crypto';
import { mfaRepo } from '@nexusflow/database';
import { encrypt, decrypt, hashToken } from '../utils/crypto.js';

export class MfaService {
  /**
   * 生成 TOTP 共享密钥
   *
   * otplib 默认生成 32 字节 Base32 密钥（如 'JBSWY3DPEHPK3PXP'）。
   * 每个用户的密钥唯一且随机。
   */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * 生成 Google Authenticator 兼容的 QR Code URI
   *
   * URI 格式：`otpauth://totp/NexusFlow:user@example.com?secret=XXX&issuer=NexusFlow`
   * 用户应用扫描此 URI 即可配置 TOTP。
   *
   * @param userEmail - 用户邮箱（显示在认证应用中）
   * @param secret - TOTP 共享密钥
   * @param issuer - 发行者名称（默认 'NexusFlow'）
   */
  generateQrCodeUri(userEmail: string, secret: string, issuer = 'NexusFlow'): string {
    return authenticator.keyuri(userEmail, issuer, secret);
  }

  /**
   * 验证 TOTP 验证码
   *
   * 自动处理 30 秒时间窗口和允许的偏差。
   *
   * @param secret - 解密后的 TOTP 密钥
   * @param token - 用户输入的 6 位数字验证码
   * @returns 验证结果
   */
  verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }

  /**
   * 生成备用恢复码
   *
   * 每个码 = 4 字节随机 hex → 8 字符大写字母数字（如 'A3F5B2C1'）。
   * 用户丢失手机时使用，每个码一次性。
   *
   * @param count - 生成数量（默认 10 个）
   */
  generateBackupCodes(count = 10): string[] {
    return Array.from({ length: count }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );
  }

  /**
   * 注册 MFA（首次绑定或重新注册）
   *
   * 流程：
   * 1. 检查是否已注册并验证（已注册则拒绝重复注册）
   * 2. 生成新的 TOTP 密钥
   * 3. AES-256-GCM 加密密钥后存入数据库
   * 4. 返回明文密钥和 QR code URI（仅此一次机会，请用户立即扫描）
   *
   * @param userId - 用户 ID
   * @returns 密钥（一次性展示）和 QR code URI
   * @throws 如果 MFA 已注册且已验证
   */
  async enroll(userId: string): Promise<{
    secret: string;
    qrCodeUri: string;
  }> {
    const existing = await mfaRepo.findByUser(userId);
    if (existing?.isVerified) {
      throw new Error('MFA already enrolled');
    }

    // 生成新密钥（如果之前有未验证的记录，覆盖之）
    const secret = this.generateSecret();
    const encrypted = encrypt(secret); // 加密存储，防止数据库泄露

    // 获取用户邮箱用于 QR code URI
    const { prisma } = await import('@nexusflow/database');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (existing) {
      // 重新创建 — 先禁用旧记录
      await mfaRepo.disable(userId);
    }

    await mfaRepo.create({
      userId,
      mfaType: 'TOTP',
      secretEncrypted: encrypted,
    });

    return {
      secret,       // ⚠️ 仅返回一次，客户端应立即展示给用户扫描
      qrCodeUri: this.generateQrCodeUri(user?.email ?? 'user', secret),
    };
  }

  /**
   * 验证 TOTP 并完成 MFA 注册
   *
   * 流程：
   * 1. 查询 MFA 配置
   * 2. 解密密钥
   * 3. 验证用户输入的 TOTP 验证码
   * 4. 验证成功 → 标记 isVerified=true，生成 backup codes
   *
   * @param userId - 用户 ID
   * @param totpCode - 用户输入的 6 位 TOTP 验证码
   * @returns verified=true + backupCodes（一次性展示给用户保存）
   */
  async verify(userId: string, totpCode: string): Promise<{
    verified: boolean;
    backupCodes?: string[];
  }> {
    const config = await mfaRepo.findByUser(userId);
    if (!config) {
      throw new Error('MFA not configured');
    }

    // 解密密钥（从加密存储 → 明文）
    const secret = decrypt(config.secretEncrypted);
    const isValid = this.verifyToken(secret, totpCode);

    if (isValid) {
      // 标记 MFA 已验证
      await mfaRepo.verify(config.id);

      // 生成并存储 backup codes（SHA-256 哈希存储）
      const backupCodes = this.generateBackupCodes();
      const hashedCodes = backupCodes.map((code) => hashToken(code));
      await mfaRepo.updateBackupCodes(config.id, hashedCodes);

      return { verified: true, backupCodes }; // ⚠️ backupCodes 仅返回一次
    }

    return { verified: false };
  }

  /**
   * MFA 挑战（每次敏感操作前验证 TOTP）
   *
   * 用于日常登录流程中的 MFA 步骤。
   *
   * @param userId - 用户 ID
   * @param totpCode - 6 位验证码
   * @returns 是否通过验证
   */
  async challenge(userId: string, totpCode: string): Promise<boolean> {
    const config = await mfaRepo.findByUser(userId);
    if (!config?.isVerified) {
      return false;
    }

    const secret = decrypt(config.secretEncrypted);
    return this.verifyToken(secret, totpCode);
  }

  /**
   * 验证备用恢复码
   *
   * 用户丢失手机时使用。流程：
   * 1. 用户提供备用码
   * 2. SHA-256 哈希后与存储的哈希列表比对
   * 3. 匹配成功 → 从列表中删除（一次性使用）
   *
   * @param userId - 用户 ID
   * @param code - 用户输入的备用码
   * @returns 是否有效（已被使用的码返回 false）
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const config = await mfaRepo.findByUser(userId);
    if (!config?.isVerified) {
      return false;
    }

    // 哈希编码后比对（存储的是哈希值）
    const codeHash = hashToken(code);
    const index = config.backupCodesHash.indexOf(codeHash);

    if (index !== -1) {
      // backup code 一次性使用，从数据库中删除
      const updatedCodes = [...config.backupCodesHash];
      updatedCodes.splice(index, 1);
      await mfaRepo.removeCode(config.id, updatedCodes);
      return true;
    }

    return false;
  }

  /**
   * 禁用 MFA
   *
   * @param userId - 用户 ID
   */
  async disable(userId: string): Promise<void> {
    await mfaRepo.disable(userId);
  }

  /**
   * 获取剩余备用码数量
   *
   * @param userId - 用户 ID
   * @returns 剩余未使用的备用码数量
   */
  async getRemainingBackupCodes(userId: string): Promise<number> {
    const config = await mfaRepo.findByUser(userId);
    return config?.backupCodesHash?.length ?? 0;
  }
}

/** MfaService 单例实例 */
export const mfaService = new MfaService();
