import { dmRepo } from '@nexusflow/database';
import { AppError, type CreateDmRoomInput, type CursorPagination, type SendMessageInput } from '@nexusflow/shared';
import { messageService } from './message.service.js';

export class DmService {
  async createOrFind1v1(workspaceId: string, createdBy: string, otherUserId: string) {
    if (createdBy === otherUserId) throw AppError.validation('Cannot create DM with yourself');
    const existing = await dmRepo.findByUsers(workspaceId, [createdBy, otherUserId]);
    if (existing) return existing;
    return dmRepo.create({ workspaceId, roomType: 'ONE_TO_ONE', createdBy }, [createdBy, otherUserId]);
  }

  async createGroup(workspaceId: string, createdBy: string, input: CreateDmRoomInput) {
    const memberIds = [...new Set([createdBy, ...input.userIds])];
    if (memberIds.length < 2) throw AppError.validation('Group DM must have at least 2 members');
    return dmRepo.create({ workspaceId, name: input.name, roomType: 'GROUP', createdBy }, memberIds);
  }

  async listUserRooms(workspaceId: string, userId: string) {
    return dmRepo.listByUser(workspaceId, userId);
  }

  async getRoom(roomId: string) {
    const room = await dmRepo.findById(roomId);
    if (!room) throw AppError.notFound('DM Room', roomId);
    return room;
  }

  async sendMessage(workspaceId: string, roomId: string, userId: string, input: SendMessageInput) {
    const room = await dmRepo.findById(roomId);
    if (!room) throw AppError.notFound('DM Room', roomId);

    return messageService.send(workspaceId, userId, { ...input, roomId, channelId: undefined });
  }

  async listMessages(workspaceId: string, roomId: string, pagination: CursorPagination) {
    return messageService.listByRoom(workspaceId, roomId, pagination);
  }

  async addMember(roomId: string, userId: string) {
    return dmRepo.addMember(roomId, userId);
  }

  async removeMember(roomId: string, userId: string) {
    return dmRepo.removeMember(roomId, userId);
  }

  async leave(roomId: string, userId: string) {
    await dmRepo.removeMember(roomId, userId);
    const memberIds = await dmRepo.getMemberIds(roomId);
    if (memberIds.length === 0) await dmRepo.deactivate(roomId);
  }
}

export const dmService = new DmService();
