import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class Prettier extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Opinionated, widely adopted', promptLabel: 'Prettier', settingValue: 'prettier' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addLintStagedCommand('*.{ts,tsx,mts}', 'prettier --write')
      .addPackage('prettier')
      .addScript('format')
      .addScript('format:check')
      .addFiles([
        '.prettierignore',
        'prettier.config.mjs',
        'scripts/format.ts',
        'scripts/format-check.ts'
      ]);

    // The framework presets' `prettier.config.mjs` spreads typescript-dev-toolkit's shared config, so only
    // `standalone` carries the options itself.
    if (!isFrameworkPreset(answers.preset)) {
      builder.addFiles(['scripts/prettier.config.ts']);
    }
  }
}
