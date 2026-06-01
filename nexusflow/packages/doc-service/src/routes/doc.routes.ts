import type { FastifyInstance, FastifyRequest } from 'fastify';
import { docService } from '../services/doc.service.js';
import { authenticate } from '../middleware/authenticate.js';

export async function docRoutes(app: FastifyInstance) {
  const a = [authenticate];

  // Documents CRUD
  app.post('/:wid/docs', { preHandler: a }, async (req, reply) => {
    const doc = await docService.create((req.params as any).wid, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: doc });
  });
  app.get('/:wid/docs', { preHandler: a }, async (req, reply) => {
    const result = await docService.list((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });
  app.get('/:wid/docs/slug/:slug', { preHandler: a }, async (req, reply) => {
    const doc = await docService.getBySlug((req.params as any).wid, (req.params as any).slug);
    return reply.send({ success: true, data: doc });
  });
  app.get('/:wid/docs/:did', { preHandler: a }, async (req, reply) => {
    const doc = await docService.getById((req.params as any).did);
    return reply.send({ success: true, data: doc });
  });
  app.patch('/:wid/docs/:did', { preHandler: a }, async (req, reply) => {
    const doc = await docService.update((req.params as any).did, req.user.sub, req.body as any);
    return reply.send({ success: true, data: doc });
  });
  app.delete('/:wid/docs/:did', { preHandler: a }, async (req, reply) => {
    await docService.softDelete((req.params as any).did);
    return reply.send({ success: true, data: { message: 'Document deleted' } });
  });
  app.get('/:wid/docs/:did/children', { preHandler: a }, async (req, reply) => {
    const children = await docService.listChildren((req.params as any).did);
    return reply.send({ success: true, data: children });
  });
  // Versions
  app.post('/:wid/docs/:did/versions', { preHandler: a }, async (req, reply) => {
    const v = await docService.createVersion((req.params as any).did, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: v });
  });
  app.get('/:wid/docs/:did/versions', { preHandler: a }, async (req, reply) => {
    const versions = await docService.listVersions((req.params as any).did);
    return reply.send({ success: true, data: versions });
  });
  app.get('/:wid/docs/:did/versions/:ver', { preHandler: a }, async (req, reply) => {
    const v = await docService.getVersion((req.params as any).did, parseInt((req.params as any).ver));
    return reply.send({ success: true, data: v });
  });
  app.post('/:wid/docs/:did/rollback/:ver', { preHandler: a }, async (req, reply) => {
    const doc = await docService.rollback((req.params as any).did, req.user.sub, parseInt((req.params as any).ver));
    return reply.send({ success: true, data: doc });
  });
  // Templates
  app.post('/:wid/templates', { preHandler: a }, async (req, reply) => {
    const t = await docService.createTemplate((req.params as any).wid, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: t });
  });
  app.get('/:wid/templates', { preHandler: a }, async (req, reply) => {
    const result = await docService.listTemplates((req.params as any).wid, req.query as any);
    return reply.send({ success: true, ...result });
  });
  app.get('/:wid/templates/:tid', { preHandler: a }, async (req, reply) => {
    const t = await docService.getTemplate((req.params as any).tid);
    return reply.send({ success: true, data: t });
  });
  app.post('/:wid/templates/:tid/use', { preHandler: a }, async (req, reply) => {
    const doc = await docService.useTemplate((req.params as any).tid, (req.params as any).wid, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: doc });
  });
  app.delete('/:wid/templates/:tid', { preHandler: a }, async (req, reply) => {
    await docService.deleteTemplate((req.params as any).tid);
    return reply.send({ success: true, data: { message: 'Template deleted' } });
  });
  // Backlinks
  app.get('/:wid/docs/:did/backlinks', { preHandler: a }, async (req, reply) => {
    const links = await docService.getBacklinks((req.params as any).did);
    return reply.send({ success: true, data: links });
  });
  app.get('/:wid/docs/:did/outgoing-links', { preHandler: a }, async (req, reply) => {
    const links = await docService.getOutgoingLinks((req.params as any).did);
    return reply.send({ success: true, data: links });
  });
  // Comments
  app.post('/:wid/docs/:did/comments', { preHandler: a }, async (req, reply) => {
    const c = await docService.createComment((req.params as any).did, req.user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: c });
  });
  app.get('/:wid/docs/:did/comments', { preHandler: a }, async (req, reply) => {
    const comments = await docService.listComments((req.params as any).did);
    return reply.send({ success: true, data: comments });
  });
  app.post('/:wid/docs/:did/comments/:cid/resolve', { preHandler: a }, async (req, reply) => {
    await docService.resolveComment((req.params as any).cid, req.user.sub);
    return reply.send({ success: true, data: { message: 'Comment resolved' } });
  });
  app.delete('/:wid/docs/:did/comments/:cid', { preHandler: a }, async (req, reply) => {
    await docService.deleteComment((req.params as any).cid);
    return reply.send({ success: true, data: { message: 'Comment deleted' } });
  });
  // Search
  app.get('/:wid/docs-search', { preHandler: a }, async (req, reply) => {
    const { q, ...opts } = req.query as any;
    const result = await docService.search((req.params as any).wid, q ?? '', opts);
    return reply.send({ success: true, ...result });
  });
}
