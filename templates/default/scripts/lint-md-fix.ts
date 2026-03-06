import { execSync } from 'node:child_process';
import process from 'node:process';

try {
  execSync('markdownlint-cli2 --fix .', { stdio: 'inherit' });
} catch {
  process.exit(1);
}
