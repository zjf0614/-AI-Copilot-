import type { FastifyInstance, FastifyRequest } from 'fastify';
import { workspaceService } from '../services/workspace.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { ssoConfigRepo } from '@nexusflow/database';
import { AppError, encrypt } from '@nexusflow/shared';
import { config } from '../config.js';

export async function workspaceRoutes(app: FastifyInstance) {

  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const ws = await workspaceService.create({ ...(request.body as any), creatorUserId: request.user.sub });
    return reply.code(201).send({ success: true, data: ws });
  });

  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const workspaces = await workspaceService.listUserWorkspaces(request.user.sub);
    return reply.send({ success: true, data: workspaces });
  });

  app.get('/:wid', { preHandler: [authenticate, workspaceIsolation, requirePermission('workspace:read')] }, async (request, reply) => {
    const ws = await workspaceService.getById((request.params as any).wid);
    return reply.send({ success: true, data: ws });
  });

  app.patch('/:wid', { preHandler: [authenticate, workspaceIsolation, requirePermission('workspace:manage')] }, async (request, reply) => {
    const ws = await workspaceService.update((request.params as any).wid, request.body as any);
    return reply.send({ success: true, data: ws });
  });

  app.delete('/:wid', { preHandler: [authenticate, workspaceIsolation, requirePermission('workspace:manage')] }, async (request, reply) => {
    await workspaceService.softDelete((request.params as any).wid);
    return reply.send({ success: true, data: { message: 'Workspace deleted' } });
  });

  app.get('/:wid/stats', { preHandler: [authenticate, workspaceIsolation, requirePermission('workspace:read')] }, async (request, reply) => {
    const stats = await workspaceService.getStats((request.params as any).wid);
    return reply.send({ success: true, data: stats });
  });

  // SSO config management
  app.post('/:wid/sso', { preHandler: [authenticate, workspaceIsolation, requirePermission('sso:manage')] }, async (request, reply) => {
    const body = request.body as any;
    const configEncrypted = encrypt(JSON.stringify(body.config), config.ENCRYPTION_KEY);
    const sso = await ssoConfigRepo.create({
      workspaceId: (request.params as any).wid,
      provider: body.provider,
      isEnabled: body.isEnabled ?? false,
      domain: body.domain,
      configEncrypted,
      metadataUrl: body.metadataUrl,
    });
    return reply.code(201).send({ success: true, data: sso });
  });

  app.get('/:wid/sso', { preHandler: [authenticate, workspaceIsolation, requirePermission('sso:read')] }, async (request, reply) => {
    const configs = await ssoConfigRepo.findByWorkspace((request.params as any).wid);
    return reply.send({
      success: true,
      data: configs.map(c => ({ id: c.id, provider: c.provider, isEnabled: c.isEnabled, domain: c.domain, metadataUrl: c.metadataUrl })),
    });
  });

  app.patch('/:wid/sso/:ssoId', { preHandler: [authenticate, workspaceIsolation, requirePermission('sso:manage')] }, async (request, reply) => {
    const config = await ssoConfigRepo.findById((request.params as any).ssoId);
    if (!config) throw AppError.notFound('SSO config');
    const updated = await ssoConfigRepo.update(config.id, request.body as any);
    return reply.send({ success: true, data: updated });
  });

  app.delete('/:wid/sso/:ssoId', { preHandler: [authenticate, workspaceIsolation, requirePermission('sso:manage')] }, async (request, reply) => {
    await ssoConfigRepo.remove((request.params as any).ssoId);
    return reply.send({ success: true, data: { message: 'SSO config removed' } });
  });
}
