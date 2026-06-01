import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const SERVICES = [
  { name: 'Auth', path: 'packages/auth-service/src/index.ts', port: 3001 },
  { name: 'Org', path: 'packages/org-service/src/index.ts', port: 3002 },
  { name: 'Chat', path: 'packages/chat-service/src/index.ts', port: 3003 },
  { name: 'Doc', path: 'packages/doc-service/src/index.ts', port: 3004 },
  { name: 'Project', path: 'packages/project-service/src/index.ts', port: 3005 },
  { name: 'Workflow', path: 'packages/workflow-service/src/index.ts', port: 3006 },
  { name: 'Notify', path: 'packages/notification-service/src/index.ts', port: 3007 },
  { name: 'AI', path: 'packages/ai-service/src/index.ts', port: 3008 },
  { name: 'Analytics', path: 'packages/analytics-service/src/index.ts', port: 3009 },
  { name: 'BFF', path: 'packages/bff/src/index.ts', port: 3000 },
];

const children = [];

for (const svc of SERVICES) {
  const child = spawn('npx', ['tsx', resolve(ROOT, svc.path)], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env },
    shell: true,
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${svc.name}:${svc.port}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${svc.name}:${svc.port}] ${d}`));
  child.on('exit', (code) => console.log(`[${svc.name}] exited with code ${code}`));
  children.push(child);
  await new Promise(r => setTimeout(r, 1500)); // Stagger startups
}

// Frontend
const vite = spawn('npx', ['vite', '--host'], {
  cwd: resolve(ROOT, 'packages/frontend'),
  stdio: 'pipe',
  env: { ...process.env },
  shell: true,
});
vite.stdout.on('data', (d) => process.stdout.write(`[Frontend:5173] ${d}`));
vite.stderr.on('data', (d) => process.stderr.write(`[Frontend:5173] ${d}`));
children.push(vite);

console.log('\n=== NexusFlow All Services Started ===');
console.log('  BFF + Console: http://localhost:3000');
console.log('  Frontend:      http://localhost:5173');
console.log('  API Docs:      http://localhost:3000/docs\n');
console.log('Press Ctrl+C to stop all services.\n');

process.on('SIGINT', () => { for (const c of children) c.kill(); process.exit(0); });
process.on('SIGTERM', () => { for (const c of children) c.kill(); process.exit(0); });
