import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { ConventionalCommits } from './ConventionalCommits.ts';
import { None } from './None.ts';

export const COMMIT_LINTING_OPTIONS: readonly FeatureOption[] = [new None(), new ConventionalCommits()];

export async function promptCommitLinting(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new ConventionalCommits(), message: 'Commit linting', options: COMMIT_LINTING_OPTIONS, savedValue });
}
