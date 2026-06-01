// Role management service

import { roleRepo } from '@nexusflow/database';
import { AppError, createRoleSchema, updateRoleSchema, PROTECTED_ROLE_NAMES, ALL_PERMISSIONS } from '@nexusflow/shared';

export class RoleService {
  async listRoles(workspaceId: string, query: { page?: number; limit?: number }) {
    return roleRepo.findMany(workspaceId, query);
  }

  async getRole(roleId: string) {
    const role = await roleRepo.findById(roleId);
    if (!role) throw AppError.notFound('Role', roleId);
    const { data: users } = await roleRepo.getUsersWithRole(roleId, {});
    return { ...role, assignedUserCount: users.length };
  }

  async createRole(workspaceId: string, input: { name: string; description?: string; permissions: string[]; inheritsFrom?: string; priority?: number }) {
    const parsed = createRoleSchema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validation('Invalid role data', parsed.error.flatten());
    }

    // Check name uniqueness
    const existing = await roleRepo.findByName(workspaceId, parsed.data.name);
    if (existing) {
      throw AppError.conflict('Role name already exists in this workspace');
    }

    // Check protected names
    if (PROTECTED_ROLE_NAMES.includes(parsed.data.name)) {
      throw AppError.conflict('Cannot create a role with a protected system name');
    }

    // Validate inheritance
    if (parsed.data.inheritsFrom) {
      const parent = await roleRepo.findById(parsed.data.inheritsFrom);
      if (!parent || parent.workspaceId !== workspaceId) {
        throw AppError.validation('Invalid parent role');
      }
      // Check for circular inheritance
      if (await this.wouldCreateCircularInheritance(parsed.data.inheritsFrom, workspaceId)) {
        throw AppError.validation('Cannot create circular role inheritance');
      }
    }

    return roleRepo.create({ ...parsed.data, workspaceId } as any);
  }

  async updateRole(roleId: string, input: Record<string, unknown>) {
    const parsed = updateRoleSchema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validation('Invalid update data', parsed.error.flatten());
    }

    const role = await roleRepo.findById(roleId);
    if (!role) throw AppError.notFound('Role', roleId);

    // System roles can't have their permissions modified
    if (role.isSystem) {
      throw AppError.conflict('Cannot modify a system role');
    }

    return roleRepo.update(roleId, parsed.data as any);
  }

  async deleteRole(roleId: string) {
    const role = await roleRepo.findById(roleId);
    if (!role) throw AppError.notFound('Role', roleId);

    if (role.isSystem) {
      throw AppError.conflict('Cannot delete a system role');
    }

    return roleRepo.delete(roleId);
  }

  async getUsersWithRole(roleId: string, query: { page?: number; limit?: number }) {
    return roleRepo.getUsersWithRole(roleId, query);
  }

  async listPermissions() {
    return ALL_PERMISSIONS;
  }

  private async wouldCreateCircularInheritance(parentId: string, workspaceId: string): Promise<boolean> {
    const visited = new Set<string>();
    let currentId: string | null = parentId;

    while (currentId) {
      if (visited.has(currentId)) return true;
      visited.add(currentId);

      const role = await roleRepo.findById(currentId);
      if (!role) break;
      currentId = role.inheritsFrom;
    }

    return false;
  }
}

export const roleService = new RoleService();
