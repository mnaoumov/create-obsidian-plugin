import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Eslint extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Industry standard for JavaScript/TypeScript', promptLabel: 'ESLint', settingValue: 'eslint' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@eslint/js')
      .addPackage('eslint-plugin-obsidianmd')
      .addPackage('globals')
      .addPackage('typescript-eslint')
      .addScript('lint')
      .addScript('lint:fix')
      .addFiles([
        'eslint.config.mts',
        'scripts/lint.ts',
        'scripts/lint-fix.ts'
      ]);
  }
}
