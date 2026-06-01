// RBAC permission aggregation service

import { roleRepo } from '@nexusflow/database';
import { ALL_PERMISSIONS } from '@nexusflow/shared';

export class PermissionService {
  async getEffectivePermissions(userId: string, workspaceId: string): Promise<{
    roles: string[];
    permissions: string[];
    scopeGrants: { permission: string; scopeType: string; scopeId: string }[];
  }> {
    const userRoles = await roleRepo.getUserRoles(userId);

    const roles: string[] = [];
    const permissionSet = new Set<string>();
    const scopeGrants: { permission: string; scopeType: string; scopeId: string }[] = [];

    for (const ur of userRoles) {
      // Handle expired role assignments
      if (ur.expiresAt && new Date() > ur.expiresAt) {
        continue;
      }

      roles.push(ur.role.name);
      const perms = ur.role.permissions as string[];

      for (const p of perms) {
        if (p === '*:*') {
          for (const ap of ALL_PERMISSIONS) {
            permissionSet.add(ap);
            scopeGrants.push({ permission: ap, scopeType: ur.scopeType, scopeId: ur.scopeId ?? workspaceId });
          }
        } else {
          permissionSet.add(p);
          scopeGrants.push({ permission: p, scopeType: ur.scopeType, scopeId: ur.scopeId ?? workspaceId });
        }
      }

      // Handle role inheritance
      if (ur.role.inheritsFrom) {
        const parentPermissions = await this.resolveInheritedPermissions(ur.role.inheritsFrom);
        for (const pp of parentPermissions) {
          permissionSet.add(pp);
          scopeGrants.push({ permission: pp, scopeType: ur.scopeType, scopeId: ur.scopeId ?? workspaceId });
        }
      }
    }

    return {
      roles,
      permissions: Array.from(permissionSet),
      scopeGrants,
    };
  }

  private async resolveInheritedPermissions(roleId: string): Promise<string[]> {
    const parent = await roleRepo.findById(roleId);
    if (!parent) return [];

    const perms = new Set<string>(parent.permissions as string[]);

    if (parent.inheritsFrom) {
      const grandparent = await this.resolveInheritedPermissions(parent.inheritsFrom);
      for (const p of grandparent) perms.add(p);
    }

    return Array.from(perms);
  }

  async checkPermission(userId: string, workspaceId: string, requiredPermission: string): Promise<boolean> {
    const effective = await this.getEffectivePermissions(userId, workspaceId);
    return effective.permissions.includes(requiredPermission) ||
           effective.permissions.includes('*:*');
  }
}

export const permissionService = new PermissionService();
