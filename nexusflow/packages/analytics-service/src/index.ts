import 'dotenv/config';
import { buildApp } from './app.js'; import { config } from './config.js';
async function start(){ const app = await buildApp(); await app.listen({port:config.PORT,host:config.HOST}); console.log(`Analytics service running on http://localhost:${config.PORT}`); }
start();
