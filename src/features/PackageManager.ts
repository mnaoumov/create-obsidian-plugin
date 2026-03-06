import { select } from '@clack/prompts';

import { assertNotCancelled } from '../clack-utils.ts';

export function getInstallCommand(pm: string): string {
  return pm === 'npm' ? 'npm install' : `${pm} install`;
}

export function getRunCommand(pm: string, script: string): string {
  if (pm === 'npm') {
    return `npm run ${script}`;
  }
  if (pm === 'yarn') {
    return `yarn ${script}`;
  }
  if (pm === 'pnpm') {
    return `pnpm ${script}`;
  }
  return `bun run ${script}`;
}

export async function promptPackageManager(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'npm',
    message: 'Package manager',
    options: [
      { hint: 'Default, comes with Node.js', label: 'npm', value: 'npm' },
      { hint: 'Fast, efficient disk space', label: 'pnpm', value: 'pnpm' },
      { hint: 'Classic alternative with workspaces', label: 'Yarn', value: 'yarn' },
      { hint: 'Fast all-in-one JavaScript toolkit', label: 'Bun', value: 'bun' }
    ]
  });
  assertNotCancelled(result);
  return result;
}
