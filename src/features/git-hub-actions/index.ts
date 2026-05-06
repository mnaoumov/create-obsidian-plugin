import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { CiAndRelease } from './ci-and-release.ts';
import { CiWorkflow } from './ci-workflow.ts';
import { None } from './none.ts';

export const GITHUB_ACTIONS_OPTIONS: readonly FeatureOption[] = [new None(), new CiAndRelease(), new CiWorkflow()];

export async function promptGitHubActions(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new CiAndRelease(), message: 'GitHub Actions', options: GITHUB_ACTIONS_OPTIONS, savedValue });
}
