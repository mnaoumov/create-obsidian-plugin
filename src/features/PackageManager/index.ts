import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Bun } from './Bun.ts';
import { Npm } from './Npm.ts';
import { Pnpm } from './Pnpm.ts';
import { Yarn } from './Yarn.ts';

export const PACKAGE_MANAGER_OPTIONS: readonly FeatureOption[] = [new Npm(), new Pnpm(), new Yarn(), new Bun()];

export function getInstallCommand(pm: string): string {
  return `${pm} install`;
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
  return promptFeature(PACKAGE_MANAGER_OPTIONS, 'Package manager', defaultValue);
}
