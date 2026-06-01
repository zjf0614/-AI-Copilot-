import { prisma, type PrismaTx } from '../client.js';
import type { AuditActionType, AuditFilter } from '@nexusflow/shared';
import { buildPagination, getSkipTake } from '@nexusflow/shared';

export class AuditRepository {
  async log(entry: {
    workspaceId: string;
    actorId: string | null;
    actorEmail?: string;
    action: AuditActionType;
    resourceType: string;
    resourceId: string | null;
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
    complianceTags?: string[];
  }, client: PrismaTx = prisma) {
    return client.auditLog.create({
      data: {
        workspaceId: entry.workspaceId,
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        action: entry.action as any,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        details: entry.details as any,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        correlationId: entry.correlationId ?? crypto.randomUUID(),
        complianceTags: entry.complianceTags ?? this.getDefaultTags(entry.action),
      },
    });
  }

  async query(filters: AuditFilter, client: PrismaTx = prisma) {
    const { skip, take } = getSkipTake(filters);
    const where: Record<string, unknown> = { workspaceId: filters.workspaceId };

    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Record<string, unknown>).gte = new Date(filters.from);
      if (filters.to) (where.createdAt as Record<string, unknown>).lte = new Date(filters.to);
    }
    if (filters.complianceTags?.length) {
      where.complianceTags = { hasSome: filters.complianceTags };
    }
    if (filters.search) {
      where.OR = [
        { actorEmail: { contains: filters.search, mode: 'insensitive' } },
        { resourceType: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sortOrder = filters.sort === 'asc' ? 'asc' : 'desc';
    const [data, total] = await Promise.all([
      client.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: sortOrder },
      }),
      client.auditLog.count({ where }),
    ]);

    return { data, pagination: buildPagination(filters, total) };
  }

  async findById(id: string, client: PrismaTx = prisma) {
    return client.auditLog.findUnique({ where: { id } });
  }

  async getStats(workspaceId: string, from?: string, to?: string, client: PrismaTx = prisma) {
    const where: Record<string, unknown> = { workspaceId };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const [total, actionBreakdown, topActors] = await Promise.all([
      client.auditLog.count({ where }),
      client.auditLog.groupBy({ by: ['action'], where, _count: true, orderBy: { _count: { action: 'desc' } } }),
      client.auditLog.groupBy({
        by: ['actorId', 'actorEmail'],
        where: { ...where, actorId: { not: null } },
        _count: true,
        orderBy: { _count: { actorId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalEntries: total,
      actionsBreakdown: Object.fromEntries(actionBreakdown.map((a) => [a.action, a._count])),
      topActors: topActors
        .filter((a) => a.actorId)
        .map((a) => ({ actorId: a.actorId!, actorEmail: a.actorEmail ?? 'unknown', count: a._count })),
    };
  }

  async exportForCsv(workspaceId: string, filters: AuditFilter, client: PrismaTx = prisma) {
    const where: Record<string, unknown> = { workspaceId };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Record<string, unknown>).gte = new Date(filters.from);
      if (filters.to) (where.createdAt as Record<string, unknown>).lte = new Date(filters.to);
    }

    return client.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        actorEmail: true,
        action: true,
        resourceType: true,
        resourceId: true,
        ipAddress: true,
        complianceTags: true,
        details: true,
      },
      take: 10000, // Limit exports to 10k rows
    });
  }

  private getDefaultTags(action: string): string[] {
    const tags = ['SOC2'];
    const gdprActions = ['USER_LOGIN', 'USER_CREATED', 'USER_DELETED', 'ROLE_ASSIGNED', 'ROLE_REVOKED',
      'GUEST_INVITED', 'GUEST_ACCEPTED', 'GUEST_REVOKED', 'MFA_ENROLLED', 'MFA_DISABLED'];
    if (gdprActions.includes(action)) {
      tags.push('ISO27001', 'GDPR');
    }
    return tags;
  }
}

export const auditRepo = new AuditRepository();
