import type { FastifyInstance, FastifyRequest } from 'fastify';
import { callService } from '../services/call.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { workspaceIsolation } from '../middleware/workspace-isolation.js';

export async function callRoutes(app: FastifyInstance) {
  const ws = [authenticate, workspaceIsolation];

  app.post('/:wid/calls', { preHandler: [...ws] }, async (req, reply) => {
    const call = await callService.initiate((req.params as any).wid, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: call });
  });

  app.get('/:wid/calls/:callId', { preHandler: [...ws] }, async (req, reply) => {
    const call = await callService.getCall((req.params as any).callId);
    return reply.send({ success: true, data: call });
  });

  app.patch('/:wid/calls/:callId', { preHandler: [...ws] }, async (req, reply) => {
    const { signalingData } = req.body as any;
    const call = await callService.relaySignaling((req.params as any).callId, signalingData);
    return reply.send({ success: true, data: call });
  });

  app.post('/:wid/calls/:callId/accept', { preHandler: [...ws] }, async (req, reply) => {
    await callService.accept((req.params as any).callId);
    return reply.send({ success: true, data: { message: 'Call accepted' } });
  });

  app.post('/:wid/calls/:callId/decline', { preHandler: [...ws] }, async (req, reply) => {
    await callService.decline((req.params as any).callId);
    return reply.send({ success: true, data: { message: 'Call declined' } });
  });

  app.post('/:wid/calls/:callId/end', { preHandler: [...ws] }, async (req, reply) => {
    await callService.end((req.params as any).callId);
    return reply.send({ success: true, data: { message: 'Call ended' } });
  });
}
