import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isDevUtilsPreset } from '../preset/is-dev-utils-preset.ts';

export class Eslint extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Industry standard for JavaScript/TypeScript', promptLabel: 'ESLint', settingValue: 'eslint' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addLintStagedCommand('*.{ts,tsx,mts}', 'eslint --fix')
      // ESLint ITSELF, which this answer never declared. `eslint.config.mts` imports `eslint/config`
      // And `scripts/lint.ts` runs the binary, but the package was only ever present because npm hoists
      // Typescript-eslint's peer copy into the root. pnpm's strict layout does not, so the config could
      // Not resolve `eslint/config` at all -- the exact class of defect a non-npm package manager
      // Exists to expose, and invisible for as long as the tier only ever ran npm.
      .addPackage('eslint')
      // Declared on BOTH presets, and on the obsidian-dev-utils ones it is the only ESLint package
      // Nothing imports. It is load-bearing anyway: the `typescript` pin's `check` command reads
      // `typescript-eslint/package.json` for the peer range that decides the pin, and `checkRequires`
      // Downgrades that pin to a manual one the moment the package leaves the project.
      .addPackage('typescript-eslint')
      .addScript('lint')
      .addScript('lint:fix')
      .addFiles([
        'eslint.config.mts',
        'scripts/lint.ts',
        'scripts/lint-fix.ts'
      ]);

    // Split on the preset, the way `scripts/lint.ts` itself already is. The obsidian-dev-utils presets
    // Wrap that package's `defineEslintConfigs` in a `scripts/eslint-config.ts` the root `eslint.config.mts`
    // Re-exports, so the root config is a thin wrapper like every other one and the rule set arrives by
    // `npm update`. The standalone preset keeps the whole config inlined, because its premise is that it
    // Depends on nothing from the ecosystem -- and that is why the emitted config could not simply BE the
    // Shared one.
    if (isDevUtilsPreset(answers.preset)) {
      builder.addFiles(['scripts/eslint-config.ts']);
      return;
    }

    builder
      .addPackage('@eslint/js')
      .addPackage('eslint-plugin-obsidianmd')
      .addPackage('globals');
  }
}
