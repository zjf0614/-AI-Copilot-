import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function countFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    if (statSync(full).isDirectory()) count += countFiles(full);
    else count++;
  }
  return count;
}

const clean = countFiles('E:/nexusflow');
const chinese = countFiles('E:/试验/nexusflow');
console.log(`Clean path (e:/nexusflow):      ${clean} files`);
console.log(`Chinese path (e:/试验/nexusflow): ${chinese} files`);
if (clean === chinese) console.log('✅ 两个目录完全同步！');
else if (Math.abs(clean - chinese) < 5) console.log('⚠️ 少量差异（可能是临时文件）');
else console.log(`❌ 差异: ${Math.abs(clean - chinese)} 文件`);
