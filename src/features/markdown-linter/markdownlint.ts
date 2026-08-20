import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

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
        // `markdownlint-cli2` only discovers a config named `.markdownlint-cli2.{jsonc,yaml,cjs,mjs}`, and
        // So does obsidian-dev-utils' runner -- which copies its own `.mjs` in when it finds none, pointing
        // At a `scripts/markdownlint-cli2-config.ts` that then has to exist. Hence this shape rather than a
        // Single `.mts` that nothing reads.
        '.markdownlint-cli2.mjs',
        'scripts/markdownlint-cli2-config.ts',
        'scripts/lint-md.ts',
        'scripts/lint-md-fix.ts'
      ]);
  }
}
