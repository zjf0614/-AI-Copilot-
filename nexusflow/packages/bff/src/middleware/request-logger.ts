// Structured request/response logging

import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requestLogger(request: FastifyRequest, reply: FastifyReply) {
  const start = Date.now();

  reply.header('X-Request-Id', request.id as string);
  reply.header('X-Response-Time', '');

  // Add response hook to log after completion
  reply.raw.on('finish', () => {
    const duration = Date.now() - start;
    reply.header('X-Response-Time', `${duration}ms`);

    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    }, `[${request.method}] ${request.url} → ${reply.statusCode} (${duration}ms)`);
  });
}
