import { readFileSync } from 'node:fs';

export const config = {
  PORT: parseInt(process.env.CHAT_PORT ?? '3003', 10),
  HOST: process.env.CHAT_HOST ?? '0.0.0.0',

  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY_PATH
    ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8')
    : 'development-public-key-change-in-production',
  JWT_ISSUER: process.env.JWT_ISSUER ?? 'nexusflow',

  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),

  UPLOAD_BUCKET: process.env.UPLOAD_BUCKET ?? 'nexusflow-uploads-dev',

  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
