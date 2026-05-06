import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Bun } from './bun.ts';
import { Npm } from './npm.ts';
import { Pnpm } from './pnpm.ts';
import { Yarn } from './yarn.ts';

export const PACKAGE_MANAGER_OPTIONS: readonly FeatureOption[] = [new Bun(), new Npm(), new Pnpm(), new Yarn()];

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

export async function promptPackageManager(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Npm(), message: 'Package manager', options: PACKAGE_MANAGER_OPTIONS, savedValue });
}
