import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { CodeMirror } from './CodeMirror.ts';
import { None } from './None.ts';

export const EDITOR_EXTENSIONS_OPTIONS: readonly FeatureOption[] = [new None(), new CodeMirror()];

export async function promptEditorExtensions(defaultValue?: string): Promise<string> {
  return promptFeature(EDITOR_EXTENSIONS_OPTIONS, 'Editor extensions', defaultValue);
}
