import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { Markdownlint } from './Markdownlint.ts';
import { None } from './None.ts';

export const MARKDOWN_LINTER_OPTIONS: readonly FeatureOption[] = [new None(), new Markdownlint()];

export async function promptMarkdownLinter(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Markdownlint(), message: 'Markdown linter', options: MARKDOWN_LINTER_OPTIONS, savedValue });
}
