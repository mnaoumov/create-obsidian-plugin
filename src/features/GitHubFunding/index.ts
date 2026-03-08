import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { FundingYml } from './FundingYml.ts';
import { None } from './None.ts';

export const GITHUB_FUNDING_OPTIONS: readonly FeatureOption[] = [new None(), new FundingYml()];

export async function promptGitHubFunding(defaultValue?: string): Promise<string> {
  return promptFeature(GITHUB_FUNDING_OPTIONS, 'GitHub funding', defaultValue);
}
