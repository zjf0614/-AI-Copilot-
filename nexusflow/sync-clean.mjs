import { cpSync, readdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const SRC = 'E:/nexusflow';
const DEST = 'E:/试验/nexusflow';

// Simple file copy function that handles directories
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (entry === 'node_modules' || entry === '.git') continue;
    const stat = statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d);
    } else {
      const content = readFileSync(s);
      writeFileSync(d, content);
    }
  }
}

console.log(`Copying ${SRC} -> ${DEST}`);
console.log(`Source exists: ${existsSync(SRC)}`);
console.log(`Dest exists: ${existsSync(DEST)}`);

// Copy all top-level items except node_modules
for (const entry of readdirSync(SRC)) {
  if (entry === 'node_modules' || entry === '.git') continue;
  const s = join(SRC, entry);
  const d = join(DEST, entry);
  const stat = statSync(s);
  if (stat.isDirectory()) {
    console.log(`Dir: ${entry}...`);
    copyDir(s, d);
  } else {
    console.log(`File: ${entry}`);
    const content = readFileSync(s);
    writeFileSync(d, content);
  }
}

console.log('\n✅ Sync complete!');
