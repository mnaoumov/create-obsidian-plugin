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
      // `scripts/commitlint.config.ts` imports `UserConfig` from here. It resolved anyway under npm,
      // Which hoists @commitlint/cli's own copy into the root, and would not have under pnpm.
      .addPackage('@commitlint/types')
      // `czg` and the `commit` script it backs: commitlint only REJECTS a bad message, so without a
      // Prompt the contributor has to know the Conventional Commits grammar by heart to get past the hook.
      .addPackage('czg')
      .addPackage('husky')
      // `nano-staged` rather than `lint-staged`: the fleet moved to it, and `depend/ban-dependencies`
      // In the generated ESLint config bans `lint-staged` outright, so a project that installed it
      // Could not pass its own `npm run lint`.
      .addPackage('nano-staged')
      .addScript('commit')
      .addFiles([
        'commitlint.config.ts',
        'scripts/commit.ts',
        'scripts/commitlint.config.ts',
        '.husky/commit-msg',
        '.husky/pre-commit',
        '.nano-staged.mjs',
        'scripts/nano-staged-config.ts'
      ]);
  }
}
