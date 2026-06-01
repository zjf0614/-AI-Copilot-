// BFF environment configuration

export const config = {
  PORT: parseInt(process.env.BFF_PORT ?? '3000', 10),
  HOST: process.env.BFF_HOST ?? '0.0.0.0',

  // Downstream services
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
  ORG_SERVICE_URL: process.env.ORG_SERVICE_URL ?? 'http://localhost:3002',
  CHAT_SERVICE_URL: process.env.CHAT_SERVICE_URL ?? 'http://localhost:3003',
  DOC_SERVICE_URL: process.env.DOC_SERVICE_URL ?? 'http://localhost:3004',
  PROJECT_SERVICE_URL: process.env.PROJECT_SERVICE_URL ?? 'http://localhost:3005',
  WORKFLOW_SERVICE_URL: process.env.WORKFLOW_SERVICE_URL ?? 'http://localhost:3006',
  NOTIFY_SERVICE_URL: process.env.NOTIFY_SERVICE_URL ?? 'http://localhost:3007',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL ?? 'http://localhost:3008',
  ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3009',

  // CORS
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
