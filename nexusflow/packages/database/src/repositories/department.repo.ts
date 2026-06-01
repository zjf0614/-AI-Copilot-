import { prisma, type PrismaTx } from '../client.js';

export class DepartmentRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.department.findUnique({
      where: { id },
      include: {
        head: { select: { id: true, displayName: true, email: true } },
        _count: { select: { members: true, children: true } },
      },
    });
  }

  async findByWorkspace(workspaceId: string, client: PrismaTx = prisma) {
    return client.department.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        head: { select: { id: true, displayName: true, email: true } },
        _count: { select: { members: true } },
      },
    });
  }

  async findTree(workspaceId: string, client: PrismaTx = prisma) {
    const all = await client.department.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        head: { select: { id: true, displayName: true, email: true } },
        _count: { select: { members: true, children: true } },
      },
    });
    return all;
  }

  async getChildren(parentId: string, client: PrismaTx = prisma) {
    return client.department.findMany({
      where: { parentId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: {
    workspaceId: string;
    name: string;
    description?: string;
    parentId?: string;
    headUserId?: string;
    sortOrder?: number;
  }, client: PrismaTx = prisma) {
    return client.department.create({ data });
  }

  async update(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.department.update({ where: { id }, data });
  }

  async delete(id: string, client: PrismaTx = prisma) {
    return client.department.delete({ where: { id } });
  }

  async addMember(userId: string, departmentId: string, isPrimary: boolean, client: PrismaTx = prisma) {
    return client.departmentMembership.create({
      data: { userId, departmentId, isPrimary },
    });
  }

  async removeMember(userId: string, departmentId: string, client: PrismaTx = prisma) {
    return client.departmentMembership.delete({
      where: { userId_departmentId: { userId, departmentId } },
    });
  }

  async getMembers(departmentId: string, client: PrismaTx = prisma) {
    return client.departmentMembership.findMany({
      where: { departmentId },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true, jobTitle: true } },
      },
    });
  }

  async hasChildren(id: string, client: PrismaTx = prisma): Promise<boolean> {
    const count = await client.department.count({ where: { parentId: id } });
    return count > 0;
  }

  async hasMembers(id: string, client: PrismaTx = prisma): Promise<boolean> {
    const count = await client.departmentMembership.count({ where: { departmentId: id } });
    return count > 0;
  }
}

export const departmentRepo = new DepartmentRepository();
