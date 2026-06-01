// Organization structure routes: departments, teams, virtual groups

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { departmentRepo, teamRepo, virtualGroupRepo } from '@nexusflow/database';
import { AppError, createDepartmentSchema, updateDepartmentSchema, createTeamSchema, updateTeamSchema, createVirtualGroupSchema, updateVirtualGroupSchema } from '@nexusflow/shared';

export async function orgRoutes(app: FastifyInstance) {

  // ─── DEPARTMENTS ─────────────────────────────────

  app.post('/:wid/departments', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const parsed = createDepartmentSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());
    const dept = await departmentRepo.create({ workspaceId: (request.params as any).wid, ...parsed.data });
    return reply.code(201).send({ success: true, data: dept });
  });

  app.get('/:wid/departments', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const depts = await departmentRepo.findByWorkspace((request.params as any).wid);
    return reply.send({ success: true, data: depts });
  });

  app.get('/:wid/departments/tree', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const allDepts = await departmentRepo.findTree((request.params as any).wid);

    // Build tree
    const buildTree = (parentId: string | null): any[] => {
      return allDepts
        .filter(d => d.parentId === parentId)
        .map(d => ({
          ...d,
          memberCount: (d as any)._count?.members ?? 0,
          children: buildTree(d.id),
        }));
    };

    const tree = buildTree(null);
    return reply.send({ success: true, data: tree });
  });

  app.get('/:wid/departments/:did', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const dept = await departmentRepo.findById((request.params as any).did);
    if (!dept) throw AppError.notFound('Department');
    const members = await departmentRepo.getMembers(dept.id);
    return reply.send({ success: true, data: { ...dept, members } });
  });

  app.patch('/:wid/departments/:did', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const parsed = updateDepartmentSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());
    const dept = await departmentRepo.update((request.params as any).did, parsed.data);
    return reply.send({ success: true, data: dept });
  });

  app.delete('/:wid/departments/:did', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { did } = request.params as any;
    const hasChildren = await departmentRepo.hasChildren(did);
    const hasMembers = await departmentRepo.hasMembers(did);
    if (hasChildren || hasMembers) {
      throw AppError.conflict('Department has children or members. Remove them first.');
    }
    await departmentRepo.delete(did);
    return reply.send({ success: true, data: { message: 'Department deleted' } });
  });

  app.post('/:wid/departments/:did/members', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { did } = request.params as any;
    const { userId, isPrimary } = request.body as any;
    await departmentRepo.addMember(userId, did, isPrimary ?? false);
    return reply.code(201).send({ success: true, data: { message: 'Member added' } });
  });

  app.delete('/:wid/departments/:did/members/:uid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { did, uid } = request.params as any;
    await departmentRepo.removeMember(uid, did);
    return reply.send({ success: true, data: { message: 'Member removed' } });
  });

  app.put('/:wid/departments/:did/head', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { did } = request.params as any;
    const { userId } = request.body as any;
    await departmentRepo.update(did, { headUserId: userId });
    return reply.send({ success: true, data: { message: 'Department head updated' } });
  });

  // ─── TEAMS ───────────────────────────────────────

  app.post('/:wid/teams', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const parsed = createTeamSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());
    const team = await teamRepo.create({ workspaceId: (request.params as any).wid, ...parsed.data });
    return reply.code(201).send({ success: true, data: team });
  });

  app.get('/:wid/teams', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const { departmentId } = request.query as any;
    const teams = await teamRepo.findByWorkspace((request.params as any).wid, departmentId);
    return reply.send({ success: true, data: teams });
  });

  app.get('/:wid/teams/:tid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const team = await teamRepo.findById((request.params as any).tid);
    if (!team) throw AppError.notFound('Team');
    const members = await teamRepo.getMembers(team.id);
    return reply.send({ success: true, data: { ...team, members } });
  });

  app.patch('/:wid/teams/:tid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const parsed = updateTeamSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());
    const team = await teamRepo.update((request.params as any).tid, parsed.data);
    return reply.send({ success: true, data: team });
  });

  app.delete('/:wid/teams/:tid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    await teamRepo.delete((request.params as any).tid);
    return reply.send({ success: true, data: { message: 'Team deleted' } });
  });

  app.post('/:wid/teams/:tid/members', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { tid } = request.params as any;
    const { userId, roleInTeam } = request.body as any;
    await teamRepo.addMember(userId, tid, roleInTeam ?? 'MEMBER');
    return reply.code(201).send({ success: true, data: { message: 'Member added' } });
  });

  app.delete('/:wid/teams/:tid/members/:uid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { tid, uid } = request.params as any;
    await teamRepo.removeMember(uid, tid);
    return reply.send({ success: true, data: { message: 'Member removed' } });
  });

  app.get('/:wid/teams/:tid/members', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const members = await teamRepo.getMembers((request.params as any).tid);
    return reply.send({ success: true, data: members });
  });

  app.put('/:wid/teams/:tid/lead', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { tid } = request.params as any;
    const { userId } = request.body as any;
    await teamRepo.setLead(tid, userId ?? null);
    return reply.send({ success: true, data: { message: 'Team lead updated' } });
  });

  // ─── VIRTUAL GROUPS ──────────────────────────────

  app.post('/:wid/vgroups', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const parsed = createVirtualGroupSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());
    const vg = await virtualGroupRepo.create({ workspaceId: (request.params as any).wid, name: parsed.data.name, description: parsed.data.description, rule: parsed.data.rule as any });
    return reply.code(201).send({ success: true, data: vg });
  });

  app.get('/:wid/vgroups', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const groups = await virtualGroupRepo.findByWorkspace((request.params as any).wid);
    return reply.send({ success: true, data: groups });
  });

  app.get('/:wid/vgroups/:vid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const { wid, vid } = request.params as any;
    const vg = await virtualGroupRepo.findById(vid);
    if (!vg) throw AppError.notFound('Virtual group');
    const members = await virtualGroupRepo.getMembers(vid);
    const dynamicMembers = await virtualGroupRepo.resolveDynamicMembers(wid, vg.rule as any);
    return reply.send({ success: true, data: { ...vg, members, dynamicMemberCount: dynamicMembers.length } });
  });

  app.patch('/:wid/vgroups/:vid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const parsed = updateVirtualGroupSchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());
    const vg = await virtualGroupRepo.update((request.params as any).vid, parsed.data);
    return reply.send({ success: true, data: vg });
  });

  app.delete('/:wid/vgroups/:vid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    await virtualGroupRepo.delete((request.params as any).vid);
    return reply.send({ success: true, data: { message: 'Virtual group deleted' } });
  });

  app.post('/:wid/vgroups/:vid/members', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { vid } = request.params as any;
    const { userId } = request.body as any;
    await virtualGroupRepo.addMember(userId, vid, true);
    return reply.code(201).send({ success: true, data: { message: 'Member added' } });
  });

  app.delete('/:wid/vgroups/:vid/members/:uid', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:manage')] }, async (request, reply) => {
    const { vid, uid } = request.params as any;
    await virtualGroupRepo.removeMember(uid, vid);
    return reply.send({ success: true, data: { message: 'Member removed' } });
  });

  // ─── ORG CHART ──────────────────────────────────

  app.get('/:wid/org-chart', { preHandler: [authenticate, workspaceIsolation, requirePermission('org:read')] }, async (request, reply) => {
    const { wid } = request.params as any;
    const allDepts = await departmentRepo.findTree(wid);
    const buildTree = (parentId: string | null): any[] =>
      allDepts.filter(d => d.parentId === parentId).map(d => ({
        id: d.id, name: d.name, description: d.description,
        head: d.head ? { id: d.head.id, displayName: d.head.displayName } : null,
        children: buildTree(d.id),
      }));

    // Users not in any department
    const { prisma } = await import('@nexusflow/database');
    const unassigned = await prisma.user.findMany({
      where: { workspaceId: wid, status: 'ACTIVE', departmentMemberships: { none: {} } },
      select: { id: true, displayName: true, email: true, avatarUrl: true, jobTitle: true },
    });

    return reply.send({ success: true, data: { departments: buildTree(null), unassignedUsers: unassigned } });
  });
}
