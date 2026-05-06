import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { ConventionalCommits } from './conventional-commits.ts';
import { None } from './none.ts';

export const COMMIT_LINTING_OPTIONS: readonly FeatureOption[] = [new None(), new ConventionalCommits()];

export async function promptCommitLinting(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new ConventionalCommits(), message: 'Commit linting', options: COMMIT_LINTING_OPTIONS, savedValue });
}
