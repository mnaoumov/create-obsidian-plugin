import { select } from '@clack/prompts';

import { assertNotCancelled } from '../../clack-utils.ts';
import type { FeatureOption } from '../../FeatureContribution.ts';
import { Markdownlint } from './Markdownlint.ts';
import { None } from './None.ts';

export const MARKDOWN_LINTER_OPTIONS: readonly FeatureOption[] = [new Markdownlint(), new None()];

export async function promptMarkdownLinter(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'markdownlint',
    message: 'Markdown linter',
    options: MARKDOWN_LINTER_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue })),
  });
  assertNotCancelled(result);
  return result;
}
