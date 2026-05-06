import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { FundingYml } from './funding-yml.ts';
import { None } from './none.ts';

export const GITHUB_FUNDING_OPTIONS: readonly FeatureOption[] = [new None(), new FundingYml()];

export async function promptGitHubFunding(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new FundingYml(), message: 'GitHub funding', options: GITHUB_FUNDING_OPTIONS, savedValue });
}
