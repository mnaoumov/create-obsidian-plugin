import { execSync } from 'node:child_process';
import process from 'node:process';

try {
  execSync('cspell . --no-progress', { stdio: 'inherit' });
} catch {
  process.exit(1);
}
