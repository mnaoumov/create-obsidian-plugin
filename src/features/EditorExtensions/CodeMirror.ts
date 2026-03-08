import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class CodeMirror extends FeatureOption {
  public constructor() {
    super({ promptHint: 'CodeMirror 6 state fields, view plugins, decorations', promptLabel: 'CodeMirror', settingValue: 'codemirror' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@codemirror/language')
      .addPackage('@codemirror/state')
      .addPackage('@codemirror/view')
      .addFiles([
        'src/EditorExtensions/SampleStateField.ts',
        'src/EditorExtensions/SampleViewPlugin.ts',
        'src/EditorExtensions/SampleWidget.ts',
        'src/EditorSuggests/SampleEditorSuggest.ts'
      ]);
  }
}
