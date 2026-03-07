import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class Markdownlint extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Lint Markdown files for style and consistency', promptLabel: 'markdownlint', settingValue: 'markdownlint' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('markdownlint')
      .addPackage('markdownlint-cli2')
      .addPackage('markdownlint-rule-relative-links')
      .addPackage('linkinator')
      .addScript('lint:md')
      .addScript('lint:md:fix')
      .addFiles([
        '.markdownlint-cli2.mts',
        'scripts/lint-md.ts',
        'scripts/lint-md-fix.ts'
      ]);
  }
}
