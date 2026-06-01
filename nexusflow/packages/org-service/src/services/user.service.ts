// User management service

import { userRepo, roleRepo } from '@nexusflow/database';
import { AppError, updateUserSchema, assignRoleSchema } from '@nexusflow/shared';
import { permissionService } from './permission.service.js';

export class UserService {
  async listUsers(workspaceId: string, query: { page?: number; limit?: number; status?: string; isGuest?: boolean; search?: string }) {
    return userRepo.findMany(workspaceId, query as any);
  }

  async getUser(workspaceId: string, userId: string) {
    const user = await userRepo.findById(userId);
    if (!user || user.workspaceId !== workspaceId) {
      throw AppError.notFound('User', userId);
    }
    return user;
  }

  async updateUser(userId: string, input: Record<string, unknown>) {
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validation('Invalid update data', parsed.error.flatten());
    }
    return userRepo.update(userId, parsed.data);
  }

  async deactivateUser(userId: string) {
    return userRepo.deactivate(userId);
  }

  async reactivateUser(userId: string) {
    return userRepo.reactivate(userId);
  }

  async getUserRoles(userId: string) {
    return roleRepo.getUserRoles(userId);
  }

  async assignRole(userId: string, input: { roleId: string; scopeType?: string; scopeId?: string; expiresAt?: string }, assignedBy: string) {
    const parsed = assignRoleSchema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validation('Invalid role assignment', parsed.error.flatten());
    }

    const { roleId, scopeType, scopeId, expiresAt } = parsed.data;

    // Verify role exists
    const role = await roleRepo.findById(roleId);
    if (!role) {
      throw AppError.notFound('Role', roleId);
    }

    return roleRepo.assignRole(
      userId,
      roleId,
      scopeType ?? 'WORKSPACE',
      scopeId ?? null,
      assignedBy,
      expiresAt ? new Date(expiresAt) : null,
    );
  }

  async revokeRole(assignmentId: string) {
    return roleRepo.revokeRole(assignmentId);
  }

  async getUserPermissions(userId: string, workspaceId: string) {
    return permissionService.getEffectivePermissions(userId, workspaceId);
  }

  async getUserOrg(userId: string) {
    const { prisma } = await import('@nexusflow/database');

    const [deptMemberships, teamMemberships] = await Promise.all([
      prisma.departmentMembership.findMany({
        where: { userId },
        include: { department: { select: { id: true, name: true } } },
      }),
      prisma.teamMembership.findMany({
        where: { userId },
        include: { team: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      departments: deptMemberships.map(m => ({
        id: m.department.id,
        name: m.department.name,
        isPrimary: m.isPrimary,
      })),
      teams: teamMemberships.map(m => ({
        id: m.team.id,
        name: m.team.name,
        roleInTeam: m.roleInTeam,
      })),
    };
  }
}

export const userService = new UserService();
