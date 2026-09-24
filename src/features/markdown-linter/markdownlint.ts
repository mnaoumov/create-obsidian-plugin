import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isDevUtilsPreset } from '../preset/is-dev-utils-preset.ts';

export class Markdownlint extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Lint Markdown files for style and consistency', promptLabel: 'markdownlint', settingValue: 'markdownlint' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addLintStagedCommand('*.md', 'markdownlint-cli2 --fix')
      .addPackage('markdownlint-cli2')
      .addDepcheckIgnore('markdownlint-cli2', 'run as a CLI by the `lint:md` scripts, configured by `.markdownlint-cli2.mjs`.')
      .addPackage('linkinator')
      .addDepcheckIgnore('linkinator', 'run as a CLI by the `lint:md` scripts.')
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
        'scripts/lint-md-fix.ts',
        // Read by linkinator from the project root under both presets; it skips the links to the plugin's own
        // Repository, which 404 until the user pushes it.
        'linkinator.config.json'
      ]);

    // Split on the preset, the way `scripts/lint-md.ts` itself already is. The obsidian-dev-utils presets
    // Spread that package's shared config, as every real plugin does, so the rule set and its custom rules
    // Arrive by `npm update`. The standalone preset writes its own, and only it imports these two.
    if (isDevUtilsPreset(answers.preset)) {
      return;
    }

    builder
      .addPackage('markdownlint')
      .addPackage('markdownlint-rule-relative-links');
  }
}
