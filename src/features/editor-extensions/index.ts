import type { FeatureOption } from '../../feature-option.ts';

import { promptFeature } from '../../feature-option.ts';
import { CodeMirror } from './code-mirror.ts';
import { None } from './none.ts';

export const EDITOR_EXTENSIONS_OPTIONS: readonly FeatureOption[] = [new None(), new CodeMirror()];

export async function promptEditorExtensions(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'Editor extensions', options: EDITOR_EXTENSIONS_OPTIONS, savedValue });
}
