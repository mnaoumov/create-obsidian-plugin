import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { ConventionalCommits } from './ConventionalCommits.ts';
import { None } from './None.ts';

export const COMMIT_LINTING_OPTIONS: readonly FeatureOption[] = [new ConventionalCommits(), new None()];

export async function promptCommitLinting(defaultValue?: string): Promise<string> {
  return promptFeature(COMMIT_LINTING_OPTIONS, 'Commit linting', defaultValue);
}
