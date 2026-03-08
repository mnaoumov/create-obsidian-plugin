import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { CiAndRelease } from './CiAndRelease.ts';
import { CiWorkflow } from './CiWorkflow.ts';
import { None } from './None.ts';

export const GITHUB_ACTIONS_OPTIONS: readonly FeatureOption[] = [new CiAndRelease(), new CiWorkflow(), new None()];

export async function promptGitHubActions(defaultValue?: string): Promise<string> {
  return promptFeature(GITHUB_ACTIONS_OPTIONS, 'GitHub Actions', defaultValue);
}
