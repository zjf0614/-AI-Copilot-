// Workspace management service

import { workspaceRepo, roleRepo, userRepo, prisma } from '@nexusflow/database';
import { AppError, createWorkspaceSchema, updateWorkspaceSchema, DEFAULT_ROLES } from '@nexusflow/shared';

export class WorkspaceService {
  async create(input: { name: string; slug: string; planTier?: string; creatorUserId: string }) {
    const parsed = createWorkspaceSchema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validation('Invalid workspace data', parsed.error.flatten());
    }

    // Check slug uniqueness
    const existing = await workspaceRepo.findBySlug(parsed.data.slug);
    if (existing) {
      throw AppError.conflict('Workspace slug already taken');
    }

    return prisma.$transaction(async (tx) => {
      const ws = await workspaceRepo.create(parsed.data, tx);

      // Seed default roles
      await roleRepo.seedDefaultRoles(ws.id, Object.values(DEFAULT_ROLES), tx);

      // Find the OWNER role
      const ownerRole = await roleRepo.findByName(ws.id, 'Owner', tx);
      if (!ownerRole) throw AppError.internal('Default roles not created');

      // Assign creator as Owner
      await roleRepo.assignRole(input.creatorUserId, ownerRole.id, 'WORKSPACE', ws.id, input.creatorUserId, null, tx);

      // Update user's workspace (if user is being moved/reassigned)
      await tx.user.update({
        where: { id: input.creatorUserId },
        data: { workspaceId: ws.id },
      });

      return ws;
    });
  }

  async getById(id: string) {
    const ws = await workspaceRepo.findById(id);
    if (!ws || !ws.isActive) {
      throw AppError.notFound('Workspace', id);
    }
    return ws;
  }

  async getBySlug(slug: string) {
    const ws = await workspaceRepo.findBySlug(slug);
    if (!ws || !ws.isActive) {
      throw AppError.notFound('Workspace');
    }
    return ws;
  }

  async listUserWorkspaces(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) return [];
    const ws = await workspaceRepo.findById(user.workspaceId);
    return ws ? [ws] : [];
  }

  async update(id: string, input: Record<string, unknown>) {
    const parsed = updateWorkspaceSchema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validation('Invalid update data', parsed.error.flatten());
    }

    const ws = await workspaceRepo.findById(id);
    if (!ws) throw AppError.notFound('Workspace', id);

    return workspaceRepo.update(id, parsed.data);
  }

  async softDelete(id: string) {
    const ws = await workspaceRepo.findById(id);
    if (!ws) throw AppError.notFound('Workspace', id);
    return workspaceRepo.softDelete(id);
  }

  async getStats(id: string) {
    const ws = await workspaceRepo.findById(id);
    if (!ws) throw AppError.notFound('Workspace', id);
    return workspaceRepo.getStats(id);
  }
}

export const workspaceService = new WorkspaceService();
