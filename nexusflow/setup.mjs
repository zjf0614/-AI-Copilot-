import { execSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'E:/试验/nexusflow';
const DEST = 'E:/nexusflow';

// Copy src files with proper error handling
function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath, { force: true });
    }
  }
}

// First ensure the destination has all source files from e:/试验/
try {
  if (!existsSync(join(DEST, 'packages'))) {
    console.log('Copying source files...');
    copyDir(SRC, DEST);
    console.log('Copy complete.');
  }
  console.log('Installing dependencies...');
  execSync('npm install', { cwd: DEST, stdio: 'inherit' });
  console.log('Install complete!');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
