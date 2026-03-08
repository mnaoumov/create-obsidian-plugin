import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { FundingYml } from './FundingYml.ts';
import { None } from './None.ts';

export const GITHUB_FUNDING_OPTIONS: readonly FeatureOption[] = [new None(), new FundingYml()];

export async function promptGitHubFunding(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new FundingYml(), message: 'GitHub funding', options: GITHUB_FUNDING_OPTIONS, savedValue });
}
