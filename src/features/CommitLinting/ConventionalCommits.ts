import type { TemplateBuilder } from '../../TemplateBuilder.ts';

import { FeatureOption } from '../../FeatureOption.ts';

export class ConventionalCommits extends FeatureOption {
  public constructor() {
    super({ promptHint: 'commitlint + husky + lint-staged', promptLabel: 'Conventional Commits', settingValue: 'conventional-commits' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@commitlint/cli')
      .addPackage('@commitlint/config-conventional')
      .addPackage('husky')
      .addPackage('lint-staged')
      .addFiles([
        'commitlint.config.ts',
        'scripts/commitlint.config.ts',
        '.husky/commit-msg',
        '.husky/pre-commit',
        '.lintstagedrc.mjs',
        'scripts/lintstagedrc.ts'
      ]);
  }
}
