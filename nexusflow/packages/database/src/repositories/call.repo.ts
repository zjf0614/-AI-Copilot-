import { prisma, type PrismaTx } from '../client.js';

export class CallRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.callSession.findUnique({ where: { id } });
  }

  async create(data: {
    workspaceId: string;
    initiatorId: string;
    channelId?: string;
    roomId?: string;
    callType: string;
    participants?: string[];
  }, client: PrismaTx = prisma) {
    return client.callSession.create({
      data: {
        ...data,
        callType: data.callType as any,
        participants: data.participants ?? [],
      } as any,
    });
  }

  async updateStatus(id: string, status: string, client: PrismaTx = prisma) {
    const data: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === 'ONGOING') data.startedAt = new Date();
    if (status === 'ENDED' || status === 'MISSED' || status === 'DECLINED') data.endedAt = new Date();
    return client.callSession.update({ where: { id }, data: data as any });
  }

  async updateSignaling(id: string, signalingData: object, client: PrismaTx = prisma) {
    return client.callSession.update({ where: { id }, data: { signalingData: signalingData as any } });
  }

  async addParticipant(id: string, userId: string, client: PrismaTx = prisma) {
    const call = await client.callSession.findUnique({ where: { id } });
    if (!call) return null;
    const participants = (call.participants as string[]) ?? [];
    if (!participants.includes(userId)) participants.push(userId);
    return client.callSession.update({ where: { id }, data: { participants: participants as any } });
  }

  async findByUser(userId: string, status?: string, client: PrismaTx = prisma) {
    const where: Record<string, unknown> = { initiatorId: userId };
    if (status) where.status = status;
    return client.callSession.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 });
  }
}

export const callRepo = new CallRepository();
