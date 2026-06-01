import { callRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { InitiateCallInput } from '@nexusflow/shared';

export class CallService {
  async initiate(workspaceId: string, initiatorId: string, input: InitiateCallInput) {
    return callRepo.create({
      workspaceId,
      initiatorId,
      channelId: input.channelId,
      roomId: input.roomId,
      callType: input.callType,
      participants: input.participantIds,
    });
  }

  async getCall(id: string) {
    const call = await callRepo.findById(id);
    if (!call) throw AppError.notFound('Call session', id);
    return call;
  }

  async accept(id: string) {
    return callRepo.updateStatus(id, 'ONGOING');
  }

  async decline(id: string) {
    return callRepo.updateStatus(id, 'DECLINED');
  }

  async end(id: string) {
    return callRepo.updateStatus(id, 'ENDED');
  }

  async relaySignaling(id: string, signalingData: object) {
    return callRepo.updateSignaling(id, signalingData);
  }
}

export const callService = new CallService();
