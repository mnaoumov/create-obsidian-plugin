import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class CodeMirror extends FeatureOption {
  public constructor() {
    super({ promptHint: 'CodeMirror 6 state fields, view plugins, decorations', promptLabel: 'CodeMirror', settingValue: 'codemirror' });
  }

  public override configure(builder: TemplateBuilder): void {
    // Not `@codemirror/language`: no sample imports it, and Obsidian peers only on these two.
    builder
      .addPackage('@codemirror/state')
      .addPackage('@codemirror/view')
      .addFiles([
        'src/editor-extensions/sample-state-field.ts',
        'src/editor-extensions/sample-view-plugin.ts',
        'src/editor-extensions/sample-widget.ts',
        'src/editor-suggests/sample-editor-suggest.ts'
      ]);
  }
}
