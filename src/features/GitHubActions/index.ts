import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { CiAndRelease } from './CiAndRelease.ts';
import { CiWorkflow } from './CiWorkflow.ts';
import { None } from './None.ts';

export const GITHUB_ACTIONS_OPTIONS: readonly FeatureOption[] = [new None(), new CiAndRelease(), new CiWorkflow()];

export async function promptGitHubActions(defaultValue?: string): Promise<string> {
  return promptFeature(GITHUB_ACTIONS_OPTIONS, 'GitHub Actions', defaultValue ?? 'ci-and-release');
}
