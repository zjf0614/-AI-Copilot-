import { prisma, type PrismaTx } from '../client.js';

export class DmRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.directMessageRoom.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } } } },
    });
  }

  async findByUsers(workspaceId: string, userIds: string[], client: PrismaTx = prisma) {
    // Find existing 1v1 room between two users
    if (userIds.length !== 2) return null;

    const rooms = await client.directMessageRoom.findMany({
      where: { workspaceId, roomType: 'ONE_TO_ONE', isActive: true, members: { every: { userId: { in: userIds } } } },
      include: { members: true },
    });

    return rooms.find(r => r.members.length === 2) ?? null;
  }

  async listByUser(workspaceId: string, userId: string, client: PrismaTx = prisma) {
    return client.directMessageRoom.findMany({
      where: { workspaceId, isActive: true, members: { some: { userId, leftAt: null } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, displayName: true } } } },
      },
    });
  }

  async create(data: { workspaceId: string; name?: string; roomType: string; createdBy: string }, memberIds: string[], client: PrismaTx = prisma) {
    return client.directMessageRoom.create({
      data: {
        ...data,
        roomType: data.roomType as any,
        members: { create: memberIds.map(userId => ({ userId })) },
      },
    });
  }

  async addMember(roomId: string, userId: string, client: PrismaTx = prisma) {
    return client.dmRoomMember.create({ data: { roomId, userId } });
  }

  async removeMember(roomId: string, userId: string, client: PrismaTx = prisma) {
    return client.dmRoomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { leftAt: new Date() },
    });
  }

  async deactivate(roomId: string, client: PrismaTx = prisma) {
    return client.directMessageRoom.update({ where: { id: roomId }, data: { isActive: false } });
  }

  async getMemberIds(roomId: string, client: PrismaTx = prisma): Promise<string[]> {
    const members = await client.dmRoomMember.findMany({
      where: { roomId, leftAt: null },
      select: { userId: true },
    });
    return members.map(m => m.userId);
  }
}

export const dmRepo = new DmRepository();
