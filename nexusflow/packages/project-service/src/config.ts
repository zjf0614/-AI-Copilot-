import { readFileSync } from 'node:fs';
export const config = {
  PORT: parseInt(process.env.PROJECT_PORT ?? '3005', 10),
  HOST: process.env.PROJECT_HOST ?? '0.0.0.0',
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY_PATH ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8') : 'dev-key',
  JWT_ISSUER: process.env.JWT_ISSUER ?? 'nexusflow',
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
