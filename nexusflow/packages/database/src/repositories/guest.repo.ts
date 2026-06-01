import { prisma, type PrismaTx } from '../client.js';

export class GuestRepository {
  async createInvitation(data: {
    workspaceId: string;
    inviterId: string;
    email: string;
    roleId: string;
    message?: string;
    expiresAt: Date;
  }, client: PrismaTx = prisma) {
    return client.guestInvitation.create({ data });
  }

  async findByToken(token: string, client: PrismaTx = prisma) {
    return client.guestInvitation.findUnique({
      where: { token },
      include: { workspace: true, role: true },
    });
  }

  async findByWorkspace(workspaceId: string, status?: string, client: PrismaTx = prisma) {
    const where: Record<string, unknown> = { workspaceId };
    if (status) where.status = status;
    return client.guestInvitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        inviter: { select: { id: true, displayName: true } },
        role: { select: { id: true, name: true } },
      },
    });
  }

  async acceptInvitation(id: string, client: PrismaTx = prisma) {
    return client.guestInvitation.update({
      where: { id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }

  async revokeInvitation(id: string, client: PrismaTx = prisma) {
    return client.guestInvitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }

  async resendInvitation(id: string, newExpiresAt: Date, client: PrismaTx = prisma) {
    return client.guestInvitation.update({
      where: { id },
      data: { expiresAt: newExpiresAt, status: 'PENDING', updatedAt: new Date() },
    });
  }
}

export const guestRepo = new GuestRepository();
