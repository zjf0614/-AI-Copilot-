import { cpSync, existsSync, mkdirSync } from 'node:fs';

const src = 'E:/试验/nexusflow/';
const dest = 'E:/nexusflow/';

if (!existsSync(dest + 'packages')) {
  console.log('Copying project files...');
  cpSync(src, dest, { recursive: true, force: true });
  console.log('Done copying.');
} else {
  console.log('Destination already has packages, skipping copy.');
}
