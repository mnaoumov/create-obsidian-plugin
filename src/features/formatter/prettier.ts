import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Prettier extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Opinionated, widely adopted', promptLabel: 'Prettier', settingValue: 'prettier' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addLintStagedCommand('*.{ts,tsx,mts}', 'prettier --write')
      .addPackage('prettier')
      .addScript('format')
      .addScript('format:check')
      .addFiles([
        '.prettierignore',
        'prettier.config.mjs',
        'scripts/prettier.config.ts',
        'scripts/format.ts',
        'scripts/format-check.ts'
      ]);
  }
}
