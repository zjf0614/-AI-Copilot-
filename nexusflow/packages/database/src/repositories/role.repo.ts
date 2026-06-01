import { prisma, type PrismaTx } from '../client.js';
import type { CreateRoleInput, UpdateRoleInput, ScopeType } from '@nexusflow/shared';

export class RoleRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.role.findUnique({ where: { id } });
  }

  async findByName(workspaceId: string, name: string, client: PrismaTx = prisma) {
    return client.role.findFirst({ where: { workspaceId, name } });
  }

  async findSystemRoles(workspaceId: string, client: PrismaTx = prisma) {
    return client.role.findMany({ where: { workspaceId, isSystem: true } });
  }

  async findMany(
    workspaceId: string,
    query: { page?: number; limit?: number },
    client: PrismaTx = prisma,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(100, query.limit ?? 20);
    const [data, total] = await Promise.all([
      client.role.findMany({
        where: { workspaceId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isSystem: 'desc' }, { priority: 'desc' }],
        include: { _count: { select: { userRoles: true } } },
      }),
      client.role.count({ where: { workspaceId } }),
    ]);
    return { data, total };
  }

  async create(input: CreateRoleInput & { workspaceId: string }, client: PrismaTx = prisma) {
    return client.role.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description,
        permissions: input.permissions,
        inheritsFrom: input.inheritsFrom,
        priority: input.priority ?? 0,
        isSystem: false,
      },
    });
  }

  async update(id: string, input: UpdateRoleInput, client: PrismaTx = prisma) {
    return client.role.update({ where: { id }, data: input });
  }

  async delete(id: string, client: PrismaTx = prisma) {
    return client.role.delete({ where: { id } });
  }

  async getUsersWithRole(
    roleId: string,
    query: { page?: number; limit?: number },
    client: PrismaTx = prisma,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(100, query.limit ?? 20);
    const [data, total] = await Promise.all([
      client.userRole.findMany({
        where: { roleId },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: true },
      }),
      client.userRole.count({ where: { roleId } }),
    ]);
    return { data, total };
  }

  async assignRole(
    userId: string,
    roleId: string,
    scopeType: ScopeType,
    scopeId: string | null,
    assignedBy: string | null,
    expiresAt: Date | null,
    client: PrismaTx = prisma,
  ) {
    return client.userRole.create({
      data: { userId, roleId, scopeType, scopeId, assignedBy, expiresAt },
    });
  }

  async revokeRole(assignmentId: string, client: PrismaTx = prisma) {
    return client.userRole.delete({ where: { id: assignmentId } });
  }

  async getUserRoles(userId: string, client: PrismaTx = prisma) {
    return client.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
  }

  async seedDefaultRoles(workspaceId: string, roles: { name: string; isSystem: boolean; permissions: string[]; priority: number; description: string }[], client: PrismaTx = prisma) {
    for (const role of roles) {
      await client.role.create({
        data: {
          workspaceId,
          name: role.name,
          isSystem: role.isSystem,
          permissions: role.permissions,
          priority: role.priority,
          description: role.description,
        },
      });
    }
  }
}

export const roleRepo = new RoleRepository();
