// ABAC policy routes

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';
import { prisma } from '@nexusflow/database';
import { AppError, createPolicySchema, updatePolicySchema } from '@nexusflow/shared';

export async function policyRoutes(app: FastifyInstance) {

  // Create policy
  app.post('/:wid/policies', { preHandler: [authenticate, workspaceIsolation, requirePermission('policy:manage')] }, async (request, reply) => {
    const parsed = createPolicySchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());

    const policy = await prisma.abacPolicy.create({
      data: {
        workspaceId: (request.params as any).wid,
        name: parsed.data.name,
        description: parsed.data.description,
        priority: parsed.data.priority ?? 0,
        effect: parsed.data.effect,
        conditions: parsed.data.conditions,
        actions: parsed.data.actions,
        resources: parsed.data.resources ?? ['*'],
      },
    });

    return reply.code(201).send({ success: true, data: policy });
  });

  // List policies
  app.get('/:wid/policies', { preHandler: [authenticate, workspaceIsolation, requirePermission('policy:read')] }, async (request, reply) => {
    const policies = await prisma.abacPolicy.findMany({
      where: { workspaceId: (request.params as any).wid },
      orderBy: { priority: 'desc' },
    });
    return reply.send({ success: true, data: policies });
  });

  // Get policy
  app.get('/:wid/policies/:pid', { preHandler: [authenticate, workspaceIsolation, requirePermission('policy:read')] }, async (request, reply) => {
    const policy = await prisma.abacPolicy.findUnique({ where: { id: (request.params as any).pid } });
    if (!policy) throw AppError.notFound('Policy');
    return reply.send({ success: true, data: policy });
  });

  // Update policy
  app.patch('/:wid/policies/:pid', { preHandler: [authenticate, workspaceIsolation, requirePermission('policy:manage')] }, async (request, reply) => {
    const parsed = updatePolicySchema.safeParse(request.body);
    if (!parsed.success) throw AppError.validation('Invalid data', parsed.error.flatten());

    const policy = await prisma.abacPolicy.update({
      where: { id: (request.params as any).pid },
      data: parsed.data,
    });
    return reply.send({ success: true, data: policy });
  });

  // Delete policy
  app.delete('/:wid/policies/:pid', { preHandler: [authenticate, workspaceIsolation, requirePermission('policy:manage')] }, async (request, reply) => {
    await prisma.abacPolicy.delete({ where: { id: (request.params as any).pid } });
    return reply.send({ success: true, data: { message: 'Policy deleted' } });
  });

  // Evaluate policy (dry-run)
  app.post('/:wid/policies/evaluate', { preHandler: [authenticate, workspaceIsolation, requirePermission('policy:read')] }, async (request, reply) => {
    const { userId, action, resource } = request.body as any;
    const { wid } = request.params as any;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { departmentMemberships: true },
    });
    if (!user) throw AppError.notFound('User');

    const attributes = {
      user: {
        id: user.id, email: user.email, jobTitle: user.jobTitle, location: user.location,
        departmentId: user.departmentMemberships[0]?.departmentId ?? null,
        isGuest: user.isGuest, mfaVerified: false,
      },
      resource: { type: resource?.type ?? 'api', id: resource?.id ?? '', metadata: {} },
      environment: { time: new Date(), dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(), ipAddress: request.ip },
    };

    // Simple policy evaluator
    const policies = await prisma.abacPolicy.findMany({
      where: { workspaceId: wid, isEnabled: true },
      orderBy: { priority: 'desc' },
    });

    for (const policy of policies) {
      const matchesAction = (policy.actions as string[]).includes(action) || (policy.actions as string[]).includes('*');
      const matchesResource = (policy.resources as string[]).includes(resource?.type ?? 'api') || (policy.resources as string[]).includes('*');
      if (!matchesAction || !matchesResource) continue;

      const conditionsMatch = evaluateConditions(policy.conditions as any, attributes);
      if (conditionsMatch) {
        return reply.send({
          success: true,
          data: { matched: true, policyId: policy.id, policyName: policy.name, effect: policy.effect, allowed: policy.effect === 'ALLOW' },
        });
      }
    }

    return reply.send({ success: true, data: { matched: false, allowed: false, reason: 'No matching policy' } });
  });

  // Reorder policies
  app.put('/:wid/policies/reorder', { preHandler: [authenticate, workspaceIsolation, requirePermission('policy:manage')] }, async (request, reply) => {
    const { orderedIds } = request.body as { orderedIds: string[] };
    for (let i = 0; i < orderedIds.length; i++) {
      await prisma.abacPolicy.update({
        where: { id: orderedIds[i] },
        data: { priority: orderedIds.length - i },
      });
    }
    return reply.send({ success: true, data: { message: 'Policies reordered' } });
  });
}

function evaluateConditions(node: any, attributes: any): boolean {
  if (node.operator === 'AND') return node.conditions.every((c: any) => evaluateConditions(c, attributes));
  if (node.operator === 'OR') return node.conditions.some((c: any) => evaluateConditions(c, attributes));
  if (node.operator === 'NOT') return !evaluateConditions(node.conditions[0], attributes);
  // Leaf: attribute comparison
  const attrValue = node.attribute.split('.').reduce((o: any, k: string) => o?.[k], attributes);
  return compareValues(attrValue, node.operator, node.value);
}

function compareValues(a: unknown, op: string, b: unknown): boolean {
  switch (op) {
    case 'eq': return a === b;
    case 'neq': return a !== b;
    case 'contains': return String(a ?? '').toLowerCase().includes(String(b).toLowerCase());
    case 'not_contains': return !String(a ?? '').toLowerCase().includes(String(b).toLowerCase());
    case 'in': return Array.isArray(b) && b.includes(a as string);
    case 'not_in': return Array.isArray(b) && !b.includes(a as string);
    case 'gt': return Number(a) > Number(b);
    case 'lt': return Number(a) < Number(b);
    case 'gte': return Number(a) >= Number(b);
    case 'lte': return Number(a) <= Number(b);
    default: return false;
  }
}
