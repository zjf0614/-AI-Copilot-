import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { AppError } from '@nexusflow/shared';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { aiService } from './services/ai.service.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: config.LOG_LEVEL, transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined }, genReqId: () => crypto.randomUUID() });
  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute', keyGenerator: (req) => req.ip });

  const auth = async (request: any, _reply: any) => {
    const h = request.headers.authorization;
    if (!h) throw new AppError('UNAUTHORIZED' as any, 'Authentication required', 401);
    try { request.user = jwt.verify(h.split(' ')[1]!, config.JWT_PUBLIC_KEY, { algorithms: ['RS256'], issuer: config.JWT_ISSUER }); }
    catch { throw new AppError('UNAUTHORIZED' as any, 'Invalid token', 401); }
  };

  app.setErrorHandler((error: any, _req: any, reply: any) => {
    if (error instanceof AppError) return reply.status(error.statusCode).send(error.toJSON());
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  });

  const a = [auth];
  // Conversations
  app.post('/api/v1/workspaces/:wid/ai/conversations', { preHandler: a }, async (req, reply) => {
    const conv = await aiService.createConversation((req.params as any).wid, (req as any).user.sub, req.body as any);
    return reply.code(201).send({ success: true, data: conv });
  });
  app.get('/api/v1/workspaces/:wid/ai/conversations', { preHandler: a }, async (req, reply) => {
    const convs = await aiService.listConversations((req.params as any).wid, (req as any).user.sub);
    return reply.send({ success: true, data: convs });
  });
  app.get('/api/v1/workspaces/:wid/ai/conversations/:cid', { preHandler: a }, async (req, reply) => {
    const conv = await aiService.getConversation((req.params as any).cid);
    return reply.send({ success: true, data: conv });
  });
  app.post('/api/v1/workspaces/:wid/ai/conversations/:cid/messages', { preHandler: a }, async (req, reply) => {
    const { role, content, tokens } = req.body as any;
    const msg = await aiService.sendMessage((req.params as any).cid, role || 'user', content, tokens);
    return reply.code(201).send({ success: true, data: msg });
  });
  app.delete('/api/v1/workspaces/:wid/ai/conversations/:cid', { preHandler: a }, async (req, reply) => {
    await aiService.deleteConversation((req.params as any).cid);
    return reply.send({ success: true, data: { message: 'Conversation deleted' } });
  });
  // Context Query
  app.post('/api/v1/workspaces/:wid/ai/query', { preHandler: a }, async (req, reply) => {
    const { contextType, contextId, query } = req.body as any;
    const conv = await aiService.queryContext((req.params as any).wid, (req as any).user.sub, contextType, contextId, query);
    return reply.send({ success: true, data: conv });
  });
  // Semantic Search
  app.post('/api/v1/workspaces/:wid/ai/search', { preHandler: a }, async (req, reply) => {
    const { query, limit } = req.body as any;
    const result = await aiService.semanticSearch((req.params as any).wid, query, limit);
    return reply.send({ success: true, data: result });
  });
  // Knowledge Bases
  app.get('/api/v1/workspaces/:wid/knowledge-bases', { preHandler: a }, async (req, reply) => {
    const kbs = await aiService.listKnowledgeBases((req.params as any).wid);
    return reply.send({ success: true, data: kbs });
  });
  app.post('/api/v1/workspaces/:wid/knowledge-bases', { preHandler: a }, async (req, reply) => {
    const kb = await aiService.createKnowledgeBase((req.params as any).wid, req.body as any);
    return reply.code(201).send({ success: true, data: kb });
  });

  app.get('/health', async () => ({ status: 'ok', service: 'ai-copilot-service', timestamp: new Date().toISOString() }));
  return app;
}
