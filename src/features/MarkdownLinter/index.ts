import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Markdownlint } from './Markdownlint.ts';
import { None } from './None.ts';

export const MARKDOWN_LINTER_OPTIONS: readonly FeatureOption[] = [new Markdownlint(), new None()];

export async function promptMarkdownLinter(defaultValue?: string): Promise<string> {
  return promptFeature(MARKDOWN_LINTER_OPTIONS, 'Markdown linter', defaultValue);
}
