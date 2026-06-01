import { cpSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'E:/nexusflow/packages';
const DEST = 'E:/试验/nexusflow/packages';

if (!existsSync(DEST)) {
  console.log('Creating destination...');
  cpSync('E:/nexusflow', DEST.replace('/packages', ''), { recursive: true, force: true });
  console.log('Full copy done.');
} else {
  // Sync packages
  for (const entry of readdirSync(SRC)) {
    const srcPath = join(SRC, entry);
    const destPath = join(DEST, entry);
    if (entry === 'node_modules' || entry === '.git') continue;
    console.log(`Syncing: ${entry}...`);
    cpSync(srcPath, destPath, { recursive: true, force: true });
  }
}

// Also sync root config files
const rootFiles = ['.env', '.env.example', '.gitignore', '.prettierrc', 'package.json', 'tsconfig.base.json', 'docker-compose.yml', 'README.md', 'dev.mjs', 'eslint.config.mjs'];
for (const f of rootFiles) {
  const s = join(SRC.replace('/packages', ''), f);
  const d = join(DEST.replace('/packages', ''), f);
  if (existsSync(s)) { cpSync(s, d, { force: true }); console.log(`Synced root: ${f}`); }
}

// Sync keys
if (existsSync('E:/nexusflow/keys')) {
  cpSync('E:/nexusflow/keys', 'E:/试验/nexusflow/keys', { recursive: true, force: true });
  console.log('Synced: keys/');
}

console.log('\n✅ Sync complete!');
