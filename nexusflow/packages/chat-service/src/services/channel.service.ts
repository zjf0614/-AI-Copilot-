import { channelRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { CreateChannelInput, UpdateChannelInput } from '@nexusflow/shared';

export class ChannelService {
  async create(workspaceId: string, createdBy: string, input: CreateChannelInput) {
    const existing = await channelRepo.findByName(workspaceId, input.name);
    if (existing) throw AppError.conflict('Channel name already exists in this workspace');
    return channelRepo.create({ ...input, workspaceId, createdBy });
  }

  async list(workspaceId: string, opts: { channelType?: string; page?: number; limit?: number; archived?: boolean }) {
    return channelRepo.listByWorkspace(workspaceId, opts);
  }

  async getById(id: string) {
    const ch = await channelRepo.findById(id);
    if (!ch || ch.isDeleted) throw AppError.notFound('Channel', id);
    return ch;
  }

  async update(id: string, input: UpdateChannelInput) {
    const ch = await channelRepo.findById(id);
    if (!ch || ch.isDeleted) throw AppError.notFound('Channel', id);
    if (input.name) { const dup = await channelRepo.findByName(ch.workspaceId, input.name); if (dup && dup.id !== id) throw AppError.conflict('Channel name already exists'); }
    return channelRepo.update(id, input as any);
  }

  async softDelete(id: string) { return channelRepo.softDelete(id); }
  async archive(id: string) { return channelRepo.archive(id); }
  async unarchive(id: string) { return channelRepo.unarchive(id); }

  async joinChannel(channelId: string, userId: string) {
    const ch = await channelRepo.findById(channelId);
    if (!ch) throw AppError.notFound('Channel', channelId);
    if (ch.channelType === 'PRIVATE') throw AppError.forbidden('Cannot auto-join a private channel. Request an invite.');
    await channelRepo.addMember(channelId, userId);
  }

  async leaveChannel(channelId: string, userId: string) {
    await channelRepo.removeMember(channelId, userId).catch(() => {});
  }

  async addMember(channelId: string, userId: string, role?: string) { return channelRepo.addMember(channelId, userId, role); }
  async removeMember(channelId: string, userId: string) { return channelRepo.removeMember(channelId, userId); }
  async updateMemberRole(channelId: string, userId: string, role: string) { return channelRepo.updateMemberRole(channelId, userId, role); }
  async getMembers(channelId: string) { return channelRepo.getMembers(channelId); }
}

export const channelService = new ChannelService();
