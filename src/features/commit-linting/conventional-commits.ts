import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class ConventionalCommits extends FeatureOption {
  public constructor() {
    super({ promptHint: 'commitlint + husky + nano-staged', promptLabel: 'Conventional Commits', settingValue: 'conventional-commits' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@commitlint/cli')
      .addPackage('@commitlint/config-conventional')
      .addPackage('husky')
      // `nano-staged` rather than `lint-staged`: the fleet moved to it, and `depend/ban-dependencies`
      // In the generated ESLint config bans `lint-staged` outright, so a project that installed it
      // Could not pass its own `npm run lint`.
      .addPackage('nano-staged')
      .addFiles([
        'commitlint.config.ts',
        'scripts/commitlint.config.ts',
        '.husky/commit-msg',
        '.husky/pre-commit',
        '.nano-staged.mjs',
        'scripts/nano-staged-config.ts'
      ]);
  }
}
