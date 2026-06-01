import 'dotenv/config';
// Auth-service entry point

import { buildApp } from './app.js';
import { config } from './config.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`Auth service running on http://${config.HOST}:${config.PORT}`);
    app.log.info(`API docs available at http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
