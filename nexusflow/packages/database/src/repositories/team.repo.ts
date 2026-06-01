import { prisma, type PrismaTx } from '../client.js';

export class TeamRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.team.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        lead: { select: { id: true, displayName: true, email: true } },
        _count: { select: { members: true } },
      },
    });
  }

  async findByWorkspace(workspaceId: string, departmentId?: string, client: PrismaTx = prisma) {
    const where: Record<string, unknown> = { workspaceId, isActive: true };
    if (departmentId) where.departmentId = departmentId;

    return client.team.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        lead: { select: { id: true, displayName: true, email: true } },
        _count: { select: { members: true } },
      },
    });
  }

  async create(data: {
    workspaceId: string;
    name: string;
    description?: string;
    departmentId?: string;
    leadUserId?: string;
  }, client: PrismaTx = prisma) {
    return client.team.create({ data });
  }

  async update(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.team.update({ where: { id }, data });
  }

  async delete(id: string, client: PrismaTx = prisma) {
    return client.team.delete({ where: { id } });
  }

  async addMember(userId: string, teamId: string, roleInTeam: string, client: PrismaTx = prisma) {
    return client.teamMembership.create({
      data: { userId, teamId, roleInTeam: roleInTeam as 'LEAD' | 'MEMBER' },
    });
  }

  async removeMember(userId: string, teamId: string, client: PrismaTx = prisma) {
    return client.teamMembership.delete({
      where: { userId_teamId: { userId, teamId } },
    });
  }

  async getMembers(teamId: string, client: PrismaTx = prisma) {
    return client.teamMembership.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true, jobTitle: true } },
      },
    });
  }

  async setLead(teamId: string, leadUserId: string | null, client: PrismaTx = prisma) {
    return client.team.update({ where: { id: teamId }, data: { leadUserId } });
  }
}

export const teamRepo = new TeamRepository();
