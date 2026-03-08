import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { BugAndFeature } from './BugAndFeature.ts';
import { None } from './None.ts';

export const GITHUB_ISSUE_TEMPLATES_OPTIONS: readonly FeatureOption[] = [new None(), new BugAndFeature()];

export async function promptGitHubIssueTemplates(defaultValue?: string): Promise<string> {
  return promptFeature(GITHUB_ISSUE_TEMPLATES_OPTIONS, 'GitHub issue templates', defaultValue ?? 'bug-and-feature');
}
