import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Eslint extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Industry standard for JavaScript/TypeScript', promptLabel: 'ESLint', settingValue: 'eslint' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addLintStagedCommand('*.{ts,tsx,mts}', 'eslint --fix')
      .addPackage('@eslint/js')
      // ESLint ITSELF, which this answer never declared. `eslint.config.mts` imports `eslint/config`
      // And `scripts/lint.ts` runs the binary, but the package was only ever present because npm hoists
      // Typescript-eslint's peer copy into the root. pnpm's strict layout does not, so the config could
      // Not resolve `eslint/config` at all -- the exact class of defect a non-npm package manager
      // Exists to expose, and invisible for as long as the tier only ever ran npm.
      .addPackage('eslint')
      .addPackage('eslint-plugin-obsidianmd')
      .addPackage('globals')
      .addPackage('typescript-eslint')
      .addScript('lint')
      .addScript('lint:fix')
      .addFiles([
        'eslint.config.mts',
        'scripts/lint.ts',
        'scripts/lint-fix.ts'
      ]);
  }
}
