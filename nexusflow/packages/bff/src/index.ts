import 'dotenv/config';
// BFF entry point

import { buildApp } from './app.js';
import { config } from './config.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`\n🚀 NexusFlow API Gateway running on http://localhost:${config.PORT}`);
    console.log(`   API Docs: http://localhost:${config.PORT}/docs`);
    console.log(`   Auth Service proxy: ${config.AUTH_SERVICE_URL}`);
    console.log(`   Org Service proxy:  ${config.ORG_SERVICE_URL}\n`);
  } catch (err) {
    console.error('Failed to start BFF:', err);
    process.exit(1);
  }
}

start();
