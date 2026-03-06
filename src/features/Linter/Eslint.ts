import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Eslint extends FeatureOption {
  constructor() {
    super({ settingValue: 'eslint', promptLabel: 'ESLint', promptHint: 'Industry standard for JavaScript/TypeScript' });
  }

  override configure(builder: TemplateBuilder): void {
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
        'scripts/lint-fix.ts',
      ]);
  }
}
