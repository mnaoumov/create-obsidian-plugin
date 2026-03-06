import { FeatureOption } from '../../FeatureContribution.ts';
import type { TemplateBuilder } from '../../TemplateBuilder.ts';

export class Markdownlint extends FeatureOption {
  constructor() {
    super({ settingValue: 'markdownlint', promptLabel: 'markdownlint', promptHint: 'Lint Markdown files for style and consistency' });
  }

  override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('markdownlint')
      .addPackage('markdownlint-cli2')
      .addPackage('markdownlint-rule-relative-links')
      .addScript('lint:md')
      .addScript('lint:md:fix')
      .addFiles([
        '.markdownlint-cli2.mts',
        'scripts/lint-md.ts',
        'scripts/lint-md-fix.ts',
      ]);
  }
}
