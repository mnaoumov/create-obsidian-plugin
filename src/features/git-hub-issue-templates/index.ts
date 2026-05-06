import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { BugAndFeature } from './bug-and-feature.ts';
import { None } from './none.ts';

export const GITHUB_ISSUE_TEMPLATES_OPTIONS: readonly FeatureOption[] = [new None(), new BugAndFeature()];

export async function promptGitHubIssueTemplates(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new BugAndFeature(), message: 'GitHub issue templates', options: GITHUB_ISSUE_TEMPLATES_OPTIONS, savedValue });
}
