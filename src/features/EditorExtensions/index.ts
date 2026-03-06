import { select } from '@clack/prompts';

import { assertNotCancelled } from '../../clack-utils.ts';
import type { FeatureOption } from '../../FeatureContribution.ts';
import { CodeMirror } from './CodeMirror.ts';
import { None } from './None.ts';

export const EDITOR_EXTENSIONS_OPTIONS: readonly FeatureOption[] = [new None(), new CodeMirror()];

export async function promptEditorExtensions(defaultValue?: string): Promise<string> {
  const result = await select({
    initialValue: defaultValue ?? 'none',
    message: 'Editor extensions',
    options: EDITOR_EXTENSIONS_OPTIONS.map((o) => ({ hint: o.promptHint, label: o.promptLabel, value: o.settingValue })),
  });
  assertNotCancelled(result);
  return result;
}
