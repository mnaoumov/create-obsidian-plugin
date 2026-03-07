import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Eslint extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Industry standard for JavaScript/TypeScript', promptLabel: 'ESLint', settingValue: 'eslint' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@eslint/js')
      .addPackage('eslint-plugin-obsidianmd', '0.1.9')
      .addPackage('globals', '14.0.0')
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
