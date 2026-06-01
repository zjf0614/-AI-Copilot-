import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'E:/nexusflow';
const DEST = 'E:/试验/nexusflow';

function listFiles(dir, base) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    if (statSync(full).isDirectory()) {
      files.push(...listFiles(full, base));
    } else {
      files.push(relative(base, full).replace(/\\/g, '/'));
    }
  }
  return files;
}

console.log('=== Source (e:/nexusflow) files ===');
const srcFiles = listFiles(SRC, SRC);
console.log(`Total: ${srcFiles.length} files`);
console.log('');

console.log('=== Destination (e:/试验/nexusflow) files ===');
if (existsSync(DEST)) {
  const destFiles = listFiles(DEST, DEST);
  console.log(`Total: ${destFiles.length} files`);
  console.log('');

  const destSet = new Set(destFiles);
  const missing = srcFiles.filter(f => !destSet.has(f));
  const extra = destFiles.filter(f => !srcFiles.has(f));

  if (missing.length > 0) {
    console.log(`=== MISSING from 试验 (${missing.length} files) ===`);
    missing.forEach(f => console.log('  MISS:', f));
  }
  if (extra.length > 0) {
    console.log(`\n=== EXTRA in 试验 (${extra.length} files) ===`);
    extra.forEach(f => console.log('  EXTRA:', f));
  }
  if (missing.length === 0 && extra.length === 0) {
    console.log('✅ 两个目录完全同步！');
  }
} else {
  console.log('❌ 目标目录不存在！');
}
