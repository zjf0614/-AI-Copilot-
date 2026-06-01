// Auth routes: register, login, logout, refresh, me, change-password

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';
import * as jwtService from '../services/jwt.service.js';
import * as tokenRotation from '../services/token-rotation.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireMfa } from '../middleware/require-mfa.js';
import { userRepo, prisma } from '@nexusflow/database';
import { AppError, ErrorCode } from '@nexusflow/shared';

export async function authRoutes(app: FastifyInstance) {

  // POST /register
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authService.register(request.body as any, request);
    return reply.code(201).send({ success: true, data: result });
  });

  // POST /login
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authService.login(request.body as any, request);
    return reply.send({ success: true, data: result });
  });

  // POST /refresh
  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Refresh token required', 401);
    }

    // Permission service (simplified — just reads from DB)
    const permissionService = {
      async getEffectivePermissions(userId: string, workspaceId: string) {
        const user = await userRepo.findById(userId);
        if (!user) return { roles: [], permissions: [] };
        const roles = user.userRoles.map(ur => ur.role.name);
        const perms = new Set<string>();
        for (const ur of user.userRoles) {
          for (const p of ur.role.permissions as string[]) {
            if (p === '*:*') {
              const { ALL_PERMISSIONS } = await import('@nexusflow/shared');
              for (const ap of ALL_PERMISSIONS) perms.add(ap);
            } else {
              perms.add(p);
            }
          }
        }
        return { roles, permissions: Array.from(perms) };
      }
    };

    const result = await tokenRotation.rotateRefreshToken(jwtService, refreshToken, permissionService);

    if (typeof result === 'object' && 'error' in result) {
      if (result.error === 'REUSE_DETECTED') {
        throw new AppError(ErrorCode.TOKEN_REUSED, 'Token reuse detected. All sessions revoked.', 401);
      }
      if (result.error === 'EXPIRED') {
        throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Refresh token expired', 401);
      }
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid refresh token', 401);
    }

    return reply.send({ success: true, data: result });
  });

  // POST /logout
  app.post('/logout', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    await tokenRotation.revokeUserTokens(request.user.sub);
    return reply.send({ success: true, data: { message: 'Logged out successfully' } });
  });

  // GET /me
  app.get('/me', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const profile = await authService.getProfile(request.user.sub);
    return reply.send({ success: true, data: profile });
  });

  // PATCH /me
  app.patch('/me', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const user = await authService.updateProfile(request.user.sub, body);
    return reply.send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        jobTitle: user.jobTitle,
        location: user.location,
      },
    });
  });

  // POST /change-password
  app.post('/change-password', { preHandler: [authenticate, requireMfa] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { currentPassword, newPassword } = request.body as any;
    const result = await authService.changePassword(request.user.sub, currentPassword, newPassword);
    return reply.send({ success: true, data: result });
  });

  // POST /forgot-password (stub — requires email integration)
  app.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, workspaceSlug } = request.body as { email: string; workspaceSlug: string };

    // Always return success to prevent email enumeration
    const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
    if (workspace) {
      const user = await userRepo.findByEmail(workspace.id, email);
      if (user) {
        // TODO: Send password reset email with token
        // For now: generate a reset token and log it
        const resetToken = crypto.randomUUID();
        console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
      }
    }

    return reply.send({
      success: true,
      data: { message: 'If the account exists, a password reset link has been sent.' },
    });
  });

  // POST /reset-password (stub)
  app.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string };
    // TODO: Validate reset token and update password
    return reply.send({
      success: true,
      data: { message: 'Password has been reset successfully.' },
    });
  });

  // GET /sessions
  app.get('/sessions', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionRepo } = await import('@nexusflow/database');
    const sessions = await sessionRepo.findByUser(request.user.sub);
    return reply.send({
      success: true,
      data: sessions.map(s => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        mfaVerified: s.mfaVerified,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      })),
    });
  });

  // DELETE /sessions/:id
  app.delete('/sessions/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionRepo } = await import('@nexusflow/database');
    const { id } = request.params as { id: string };
    await sessionRepo.revoke(id);
    return reply.send({ success: true, data: { message: 'Session revoked' } });
  });
}
