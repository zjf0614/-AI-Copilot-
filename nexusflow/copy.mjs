import { execSync } from 'node:child_process';

try {
  console.log('Copying via xcopy...');
  execSync('xcopy "E:\\试验\\nexusflow\\packages" "E:\\nexusflow\\packages" /E /Y /Q', {
    stdio: 'inherit',
    shell: 'cmd.exe'
  });
  console.log('Copy complete!');
} catch (err) {
  console.error('Copy failed:', err.message);
  process.exit(1);
}
