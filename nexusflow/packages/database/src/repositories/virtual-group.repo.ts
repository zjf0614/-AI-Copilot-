import { prisma, type PrismaTx } from '../client.js';
import type { VirtualGroupRule } from '@nexusflow/shared';

export class VirtualGroupRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.virtualGroup.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
  }

  async findByWorkspace(workspaceId: string, client: PrismaTx = prisma) {
    return client.virtualGroup.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });
  }

  async create(data: {
    workspaceId: string;
    name: string;
    description?: string;
    rule: VirtualGroupRule;
  }, client: PrismaTx = prisma) {
    return client.virtualGroup.create({ data: { ...data, rule: data.rule as object } });
  }

  async update(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.virtualGroup.update({ where: { id }, data });
  }

  async delete(id: string, client: PrismaTx = prisma) {
    return client.virtualGroup.delete({ where: { id } });
  }

  async addMember(userId: string, virtualGroupId: string, addedManually: boolean, client: PrismaTx = prisma) {
    return client.virtualGroupMembership.create({
      data: { userId, virtualGroupId, addedManually },
    });
  }

  async removeMember(userId: string, virtualGroupId: string, client: PrismaTx = prisma) {
    return client.virtualGroupMembership.delete({
      where: { userId_virtualGroupId: { userId, virtualGroupId } },
    });
  }

  async getMembers(virtualGroupId: string, client: PrismaTx = prisma) {
    return client.virtualGroupMembership.findMany({
      where: { virtualGroupId },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true, jobTitle: true } },
      },
    });
  }

  async resolveDynamicMembers(workspaceId: string, rule: VirtualGroupRule, client: PrismaTx = prisma) {
    // Fetch all active users for the workspace with their attributes
    const users = await client.user.findMany({
      where: { workspaceId, status: 'ACTIVE' },
      include: {
        departmentMemberships: { include: { department: true } },
        teamMemberships: true,
      },
    });

    return users.filter((user) => {
      return this.evaluateRule(rule, user);
    });
  }

  // Evaluate a virtual group rule against a user's attributes
  private evaluateRule(rule: VirtualGroupRule, user: Record<string, unknown>): boolean {
    if (rule.operator === 'AND') {
      return rule.conditions.every((c: any) => this.evaluateCondition(c, user));
    }
    if (rule.operator === 'OR') {
      return rule.conditions.some((c: any) => this.evaluateCondition(c, user));
    }
    if (rule.operator === 'NOT') {
      return !this.evaluateCondition(rule.conditions[0]!, user);
    }
    return false;
  }

  private evaluateCondition(condition: any, user: Record<string, unknown>): boolean {
    if (condition.operator && condition.conditions) {
      return this.evaluateRule(condition, user);
    }
    const attrValue = this.resolvePath(user, condition.attribute);
    return this.compareValues(attrValue, condition.operator, condition.value);
  }

  private resolvePath(obj: any, path: string): unknown {
    const value = path.split('.').reduce((o, k) => o?.[k], obj);
    // Map user attributes
    if (path === 'user.department_id' && obj.departmentMemberships) {
      return (obj as any).departmentMemberships[0]?.department?.id ?? null;
    }
    return value;
  }

  private compareValues(a: unknown, op: string, b: unknown): boolean {
    switch (op) {
      case 'eq': return a === b;
      case 'neq': return a !== b;
      case 'contains': return String(a ?? '').includes(String(b));
      case 'not_contains': return !String(a ?? '').includes(String(b));
      case 'in': return Array.isArray(b) && b.includes(a as string);
      case 'not_in': return Array.isArray(b) && !b.includes(a as string);
      case 'gt': return Number(a) > Number(b);
      case 'lt': return Number(a) < Number(b);
      case 'gte': return Number(a) >= Number(b);
      case 'lte': return Number(a) <= Number(b);
      default: return false;
    }
  }
}

export const virtualGroupRepo = new VirtualGroupRepository();
