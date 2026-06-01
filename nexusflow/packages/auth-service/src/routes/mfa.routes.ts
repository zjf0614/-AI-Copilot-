// MFA routes: enroll, verify, challenge, disable, backup-codes

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { mfaService } from '../services/mfa.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireMfa } from '../middleware/require-mfa.js';
import * as jwtService from '../services/jwt.service.js';
import * as tokenRotation from '../services/token-rotation.js';
import { userRepo } from '@nexusflow/database';
import { AppError, mfaVerifySchema, mfaChallengeSchema } from '@nexusflow/shared';
import { getClientIp } from '../utils/ip-resolver.js';

export async function mfaRoutes(app: FastifyInstance) {

  // POST /enroll — start MFA enrollment
  app.post('/enroll', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await mfaService.enroll(request.user.sub);
      return reply.send({
        success: true,
        data: {
          secret: result.secret,
          qrCodeUri: result.qrCodeUri,
        },
      });
    } catch (err: any) {
      if (err.message === 'MFA already enrolled') {
        throw new AppError('MFA_ALREADY_ENROLLED' as any, err.message, 409);
      }
      throw err;
    }
  });

  // POST /verify — verify TOTP code and complete enrollment
  app.post('/verify', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = mfaVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid TOTP code', parsed.error.flatten());
    }

    const result = await mfaService.verify(request.user.sub, parsed.data.totpCode);
    if (!result.verified) {
      throw new AppError('MFA_INVALID' as any, 'Invalid TOTP code', 400);
    }

    return reply.send({
      success: true,
      data: {
        message: 'MFA enrolled successfully',
        backupCodes: result.backupCodes,
      },
    });
  });

  // POST /challenge — submit TOTP code during login, receive full access token
  app.post('/challenge', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = mfaChallengeSchema.safeParse(request.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }

    const { mfaToken, totpCode } = parsed.data;

    // Verify MFA challenge token
    let challengePayload;
    try {
      challengePayload = jwtService.verifyMfaChallengeToken(mfaToken);
    } catch {
      throw new AppError('MFA_INVALID' as any, 'Invalid or expired MFA challenge token', 401);
    }

    // Verify TOTP code
    const isValid = await mfaService.challenge(challengePayload.sub, totpCode);
    if (!isValid) {
      // Also try backup codes
      const isBackupValid = await mfaService.verifyBackupCode(challengePayload.sub, totpCode);
      if (!isBackupValid) {
        throw new AppError('MFA_INVALID' as any, 'Invalid TOTP code', 400);
      }
    }

    // Update login info
    await userRepo.updateLoginInfo(challengePayload.sub, getClientIp(request));

    // Get user info
    const user = await userRepo.findById(challengePayload.sub);
    if (!user) {
      throw AppError.notFound('User', challengePayload.sub);
    }

    // Get permissions
    const permissions = new Set<string>();
    for (const ur of user.userRoles) {
      for (const p of ur.role.permissions as string[]) {
        if (p === '*:*') {
          const { ALL_PERMISSIONS } = await import('@nexusflow/shared');
          for (const ap of ALL_PERMISSIONS) permissions.add(ap);
        } else {
          permissions.add(p);
        }
      }
    }

    // Issue full tokens
    const tokens = await tokenRotation.createTokenPair(
      jwtService,
      {
        sub: user.id,
        email: user.email,
        workspaceId: user.workspaceId,
        roles: user.userRoles.map(ur => ur.role.name),
        permissions: Array.from(permissions),
        mfaVerified: true,
      },
      request.headers['user-agent'],
      getClientIp(request),
    );

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        ...tokens,
      },
    });
  });

  // DELETE / — disable MFA
  app.delete('/', { preHandler: [authenticate, requireMfa] }, async (request: FastifyRequest, reply: FastifyReply) => {
    await mfaService.disable(request.user.sub);
    return reply.send({ success: true, data: { message: 'MFA disabled' } });
  });

  // POST /backup-codes — regenerate backup codes
  app.post('/backup-codes', { preHandler: [authenticate, requireMfa] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const codes = mfaService.generateBackupCodes();
    const { hashToken } = await import('../utils/crypto.js');
    const hashedCodes = codes.map(code => hashToken(code));

    const { mfaRepo } = await import('@nexusflow/database');
    const config = await mfaRepo.findByUser(request.user.sub);
    if (config) {
      await mfaRepo.updateBackupCodes(config.id, hashedCodes);
    }

    return reply.send({
      success: true,
      data: { backupCodes: codes },
    });
  });
}
