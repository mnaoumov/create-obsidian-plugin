import type { FeatureOption } from '../../FeatureOption.ts';

import { promptFeature } from '../../FeatureOption.ts';
import { CodeMirror } from './CodeMirror.ts';
import { None } from './None.ts';

export const EDITOR_EXTENSIONS_OPTIONS: readonly FeatureOption[] = [new None(), new CodeMirror()];

export async function promptEditorExtensions(savedValue?: string): Promise<string> {
  return promptFeature({ defaultOption: new None(), message: 'Editor extensions', options: EDITOR_EXTENSIONS_OPTIONS, savedValue });
}
