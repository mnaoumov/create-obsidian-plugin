import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { addHusky } from '../git-hooks.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class ConventionalCommits extends FeatureOption {
  public constructor() {
    super({ promptHint: 'commitlint + a husky commit-msg hook', promptLabel: 'Conventional Commits', settingValue: 'conventional-commits' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    addHusky(builder);
    builder
      .addPackage('@commitlint/cli')
      .addDepcheckIgnore('@commitlint/cli', '`.husky/commit-msg` runs it as the `commitlint` binary.')
      // `czg` and the `commit` script it backs: commitlint only REJECTS a bad message, so without a
      // Prompt the contributor has to know the Conventional Commits grammar by heart to get past the hook.
      .addPackage('czg')
      .addDepcheckIgnore('czg', 'run as a CLI by `scripts/commit.ts`.')
      .addScript('commit')
      .addFiles([
        'commitlint.config.ts',
        'scripts/commit.ts',
        'scripts/commitlint-config.ts',
        '.husky/commit-msg'
      ]);

    // Split on the preset, as every real plugin is: the toolkit presets re-export typescript-dev-toolkit's
    // `commitlintConfig`, which adds the forbidden-patterns and header-spellcheck rules, arrives by
    // `npm update`, and resolves `@commitlint/config-conventional` from its own dependencies. The standalone
    // Preset writes its own config, so only it declares the preset it extends and the type it imports.
    if (isFrameworkPreset(answers.preset)) {
      return;
    }

    builder
      .addPackage('@commitlint/config-conventional')
      .addDepcheckIgnore('@commitlint/config-conventional', 'extended by name (a string in the `extends` of `scripts/commitlint-config.ts`), never imported.')
      // `scripts/commitlint-config.ts` imports `UserConfig` from here. It resolved anyway under npm,
      // Which hoists @commitlint/cli's own copy into the root, and would not have under pnpm.
      .addPackage('@commitlint/types');
  }
}
