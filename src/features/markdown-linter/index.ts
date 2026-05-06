import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { Markdownlint } from './markdownlint.ts';
import { None } from './none.ts';

export const MARKDOWN_LINTER_OPTIONS: readonly FeatureOption[] = [new None(), new Markdownlint()];

export async function promptMarkdownLinter(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new Markdownlint(), message: 'Markdown linter', options: MARKDOWN_LINTER_OPTIONS, savedValue });
}
