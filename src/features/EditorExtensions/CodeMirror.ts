import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class CodeMirror extends FeatureOption {
  constructor() {
    super({ settingValue: 'codemirror', promptLabel: 'CodeMirror', promptHint: 'CodeMirror 6 state fields, view plugins, decorations' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@codemirror/language', '6.11.2')
      .addPackage('@codemirror/state', '6.5.0')
      .addPackage('@codemirror/view', '6.38.6')
      .addFiles([
        'src/EditorExtensions/SampleStateField.ts',
        'src/EditorExtensions/SampleViewPlugin.ts',
        'src/EditorExtensions/SampleWidget.ts',
        'src/EditorSuggests/SampleEditorSuggest.ts',
      ]);
  }
}
