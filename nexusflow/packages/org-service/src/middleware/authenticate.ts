// JWT authentication middleware for org-service (verifies tokens from auth-service)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError, ErrorCode } from '@nexusflow/shared';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  workspaceId: string;
  roles: string[];
  permissions: string[];
  mfaVerified: boolean;
  jti: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AccessTokenPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Malformed authorization header', 401);
  }

  const token = parts[1]!;

  try {
    const payload = jwt.verify(token, config.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: config.JWT_ISSUER,
    }) as AccessTokenPayload;

    request.user = payload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Access token has expired', 401);
    }
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid access token', 401);
  }
}
