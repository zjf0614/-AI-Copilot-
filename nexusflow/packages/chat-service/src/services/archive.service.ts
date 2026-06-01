import { archiveRepo } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { CreateArchivePolicyInput, UpdateArchivePolicyInput } from '@nexusflow/shared';

export class ArchiveService {
  async createPolicy(workspaceId: string, input: CreateArchivePolicyInput) {
    return archiveRepo.createPolicy({ ...input, workspaceId });
  }

  async listPolicies(workspaceId: string) {
    return archiveRepo.listPolicies(workspaceId);
  }

  async updatePolicy(id: string, input: UpdateArchivePolicyInput) {
    return archiveRepo.updatePolicy(id, input as any);
  }

  async deletePolicy(id: string) {
    return archiveRepo.deletePolicy(id);
  }

  async runArchival(policyId: string) {
    const policy = await archiveRepo.findPolicy(policyId);
    if (!policy || !policy.isEnabled) throw AppError.notFound('Archive policy');

    const before = new Date(Date.now() - policy.durationDays * 86400000);
    const count = await archiveRepo.archiveMessages(policy.workspaceId, policy.channelId, before, policy.id);
    return { archivedCount: count, policyId: policy.id, before: before.toISOString() };
  }

  async queryArchived(workspaceId: string, opts: { channelId?: string; from?: string; to?: string; page?: number; limit?: number }) {
    return archiveRepo.queryArchived(workspaceId, opts);
  }

  async exportMessages(workspaceId: string, opts: { channelId?: string; from?: string; to?: string }) {
    const { data } = await archiveRepo.queryArchived(workspaceId, { ...opts, page: 1, limit: 10000 });
    return {
      exportJobId: 'export_' + Date.now(),
      status: 'completed',
      messageCount: data.length,
      data,
    };
  }
}

export const archiveService = new ArchiveService();
