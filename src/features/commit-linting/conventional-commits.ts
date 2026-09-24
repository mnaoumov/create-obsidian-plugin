import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class ConventionalCommits extends FeatureOption {
  public constructor() {
    super({ promptHint: 'commitlint + husky + nano-staged', promptLabel: 'Conventional Commits', settingValue: 'conventional-commits' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('@commitlint/cli')
      .addDepcheckIgnore('@commitlint/cli', '`.husky/commit-msg` runs it as the `commitlint` binary.')
      .addPackage('@commitlint/config-conventional')
      .addDepcheckIgnore('@commitlint/config-conventional', 'extended by name (a string in the `extends` of `scripts/commitlint-config.ts`), never imported.')
      // `scripts/commitlint.config.ts` imports `UserConfig` from here. It resolved anyway under npm,
      // Which hoists @commitlint/cli's own copy into the root, and would not have under pnpm.
      .addPackage('@commitlint/types')
      // `czg` and the `commit` script it backs: commitlint only REJECTS a bad message, so without a
      // Prompt the contributor has to know the Conventional Commits grammar by heart to get past the hook.
      .addPackage('czg')
      .addDepcheckIgnore('czg', 'run as a CLI by `scripts/commit.ts`.')
      .addPackage('husky')
      .addDepcheckIgnore('husky', 'run as a CLI by `scripts/prepare.ts`; the hooks in `.husky/` are its output.')
      // `nano-staged` rather than `lint-staged`: the reference plugins moved to it, and `depend/ban-dependencies`
      // In the generated ESLint config bans `lint-staged` outright, so a project that installed it
      // Could not pass its own `npm run lint`.
      .addPackage('nano-staged')
      .addDepcheckIgnore('nano-staged', '`.husky/pre-commit` runs it; configured by `scripts/nano-staged-config.ts`.')
      .addScript('commit')
      // Husky only writes the hooks into `.git/hooks` when its binary runs, which is what `prepare`
      // Is for -- npm runs that lifecycle script after every install. Without it the two hook files
      // Below were emitted, husky was installed, and no hook ever fired: a commit-message linter that
      // Silently lints nothing, which is precisely the class of failure this project's verification is
      // Built to refuse.
      .addScript('prepare')
      .addFiles([
        'scripts/prepare.ts',
        'commitlint.config.ts',
        'scripts/commit.ts',
        'scripts/commitlint-config.ts',
        '.husky/commit-msg',
        '.husky/pre-commit',
        '.nano-staged.mjs',
        'scripts/nano-staged-config.ts'
      ]);
  }
}
