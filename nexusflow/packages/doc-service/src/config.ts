import { readFileSync } from 'node:fs';

export const config = {
  PORT: parseInt(process.env.DOC_PORT ?? '3004', 10),
  HOST: process.env.DOC_HOST ?? '0.0.0.0',
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY_PATH ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8') : 'development-public-key-change-in-production',
  JWT_ISSUER: process.env.JWT_ISSUER ?? 'nexusflow',
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
