// Core authentication service: register, login, logout, password management

import { userRepo, workspaceRepo, roleRepo, mfaRepo, prisma } from '@nexusflow/database';
import { AppError, ErrorCode, registerSchema, loginSchema, changePasswordSchema, DEFAULT_WORKSPACE_SETTINGS } from '@nexusflow/shared';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password.service.js';
import * as jwtService from './jwt.service.js';
import * as tokenRotation from './token-rotation.js';
import { getClientIp } from '../utils/ip-resolver.js';
import type { FastifyRequest } from 'fastify';

export class AuthService {
  async register(input: { email: string; password: string; displayName: string; workspaceSlug: string; workspaceName: string }, request: FastifyRequest) {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validation('Invalid registration data', parsed.error.flatten());
    }

    const { email, password, displayName, workspaceSlug, workspaceName } = parsed.data;

    // Check workspace availability
    let workspace = await workspaceRepo.findBySlug(workspaceSlug);
    if (workspace) {
      throw AppError.conflict('Workspace slug already taken');
    }

    // Validate password strength
    const pwCheck = validatePasswordStrength(password, DEFAULT_WORKSPACE_SETTINGS.passwordPolicy);
    if (!pwCheck.valid) {
      throw AppError.validation('Password does not meet requirements', pwCheck.errors);
    }

    // Create workspace + user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create workspace
      const ws = await workspaceRepo.create({
        name: workspaceName,
        slug: workspaceSlug,
        planTier: 'FREE',
      }, tx);

      // Seed default roles
      const { DEFAULT_ROLES } = await import('@nexusflow/shared');
      await roleRepo.seedDefaultRoles(ws.id, Object.values(DEFAULT_ROLES), tx);

      // Find the OWNER role
      const ownerRole = await roleRepo.findByName(ws.id, 'Owner', tx);
      if (!ownerRole) throw AppError.internal('Default roles not created');

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await userRepo.create({
        workspaceId: ws.id,
        email,
        passwordHash,
        displayName,
      }, [ownerRole.id], tx);

      return { user, workspace: ws };
    });

    // Get permissions for token
    const permissions = await this.getPermissionsForUser(result.user.id, result.workspace.id);

    const tokens = await tokenRotation.createTokenPair(
      jwtService,
      {
        sub: result.user.id,
        email: result.user.email,
        workspaceId: result.workspace.id,
        roles: ['Owner'],
        permissions,
        mfaVerified: false,
      },
      request.headers['user-agent'],
      getClientIp(request),
    );

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
      },
      ...tokens,
    };
  }

  async login(input: { email: string; password: string; workspaceSlug: string }, request: FastifyRequest) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validation('Invalid login data', parsed.error.flatten());
    }

    const { email, password, workspaceSlug } = parsed.data;

    // Find workspace
    const workspace = await workspaceRepo.findBySlug(workspaceSlug);
    if (!workspace || !workspace.isActive) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials', 401);
    }

    // Find user
    const user = await userRepo.findByEmail(workspace.id, email);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials', 401);
    }

    // Check lockout
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(ErrorCode.ACCOUNT_LOCKED, `Account is locked. Try again in ${remainingMinutes} minutes`, 423);
    }

    // Check password (SSO-only users have no password)
    if (!user.passwordHash) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'This account uses SSO. Please sign in with your identity provider.', 401);
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      // Increment failed attempts
      await userRepo.incrementFailedAttempts(user.id);

      // Check if we need to lock the account
      const settings = workspace.settings as any;
      const maxAttempts = settings?.passwordPolicy?.maxFailedAttempts ?? 5;
      const lockoutDuration = settings?.passwordPolicy?.lockoutDurationMinutes ?? 15;

      const updatedUser = await prisma.user.findUnique({ where: { id: user.id }, select: { failedLoginAttempts: true } });
      if (updatedUser && updatedUser.failedLoginAttempts >= maxAttempts) {
        await userRepo.lockAccount(user.id, lockoutDuration);
        throw new AppError(ErrorCode.ACCOUNT_LOCKED, `Account locked after ${maxAttempts} failed attempts. Try again in ${lockoutDuration} minutes.`, 423);
      }

      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials', 401);
    }

    // Check MFA
    const isMfaEnrolled = await mfaRepo.isEnrolled(user.id);
    const workspaceSettings = workspace.settings as any;

    if (isMfaEnrolled) {
      // Return MFA challenge token
      const mfaToken = jwtService.signMfaChallengeToken(user.id, workspace.id);
      return {
        mfaRequired: true,
        mfaToken,
      };
    }

    // If MFA is required by workspace policy but not enrolled
    if (workspaceSettings?.mfaRequired && !isMfaEnrolled) {
      throw new AppError(ErrorCode.MFA_REQUIRED, 'MFA enrollment is required by workspace policy', 403);
    }

    // Update login info
    await userRepo.updateLoginInfo(user.id, getClientIp(request));

    // Get permissions
    const permissions = await this.getPermissionsForUser(user.id, workspace.id);

    // Create tokens
    const tokens = await tokenRotation.createTokenPair(
      jwtService,
      {
        sub: user.id,
        email: user.email,
        workspaceId: workspace.id,
        roles: user.userRoles.map(ur => ur.role.name),
        permissions,
        mfaVerified: false,
      },
      request.headers['user-agent'],
      getClientIp(request),
    );

    return {
      mfaRequired: false,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      ...tokens,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw AppError.validation('Cannot change password for SSO accounts');
    }

    const isValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Current password is incorrect', 400);
    }

    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      throw AppError.validation('Password does not meet requirements', pwCheck.errors);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    // Revoke all refresh tokens (force re-login on all devices)
    await tokenRotation.revokeUserTokens(userId);

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
        departmentMemberships: { include: { department: true } },
        workspace: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!user) {
      throw AppError.notFound('User', userId);
    }

    const permissions = await this.getPermissionsForUser(user.id, user.workspaceId);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      jobTitle: user.jobTitle,
      location: user.location,
      status: user.status,
      isGuest: user.isGuest,
      workspaceId: user.workspaceId,
      workspaceName: user.workspace.name,
      roles: user.userRoles.map(ur => ur.role.name),
      permissions,
    };
  }

  async updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string | null; jobTitle?: string | null; location?: string | null }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });
    return user;
  }

  private async getPermissionsForUser(userId: string, workspaceId: string): Promise<string[]> {
    const userRoles = await roleRepo.getUserRoles(userId);

    const allPermissions = new Set<string>();
    for (const ur of userRoles) {
      const permissions = ur.role.permissions as string[];
      for (const p of permissions) {
        if (p === '*:*') {
          // Wildcard — add all known permissions
          const { ALL_PERMISSIONS } = await import('@nexusflow/shared');
          for (const ap of ALL_PERMISSIONS) {
            allPermissions.add(ap);
          }
        } else {
          allPermissions.add(p);
        }
      }
    }

    return Array.from(allPermissions);
  }
}

export const authService = new AuthService();
