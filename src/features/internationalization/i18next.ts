import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class I18next extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Popular i18n framework with JSON translations', promptLabel: 'i18next', settingValue: 'i18next' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('i18next')
      .addFiles([
        'src/i18n/index.ts',
        'src/i18n/locales/en.json'
      ]);
    // `src/i18n/index.ts` imports the locale as JSON. esbuild, vite, webpack and parcel all import JSON
    // Natively; rollup does not, and without a plugin it parses the file as JavaScript and dies with
    // "Expected ';', '}' or <eof> (Note that you need @rollup/plugin-json to import JSON files)".
    if (answers.bundler === 'rollup') {
      builder
        .addPackage('@rollup/plugin-json')
        .addPartial('rollup-json');
    }
  }
}
