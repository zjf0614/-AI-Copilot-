import 'dotenv/config';
import { buildApp } from './app.js';
import { config } from './config.js';

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`Chat service running on http://${config.HOST}:${config.PORT}`);
    app.log.info(`WebSocket available at ws://${config.HOST}:${config.PORT}/ws`);
    app.log.info(`API docs at http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
