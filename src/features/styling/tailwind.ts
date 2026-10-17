import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';
import { addToolkitStyles } from './toolkit-styles.ts';

export class Tailwind extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Utility-first CSS framework', promptLabel: 'Tailwind CSS', settingValue: 'tailwind' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      .addPackage('tailwindcss')
      .addDepcheckIgnore('tailwindcss', 'imported by `src/styles/main.css` (`@import "tailwindcss"`), which depcheck does not read.')
      .addFiles(['src/styles/main.css']);

    // The obsidian-dev-toolkit `styles.tailwind` runs every stylesheet through `@tailwindcss/postcss`, on every bundler.
    if (isFrameworkPreset(answers.preset)) {
      builder
        .addPackage('@tailwindcss/postcss')
        .addDepcheckIgnore('@tailwindcss/postcss', 'loaded by obsidian-dev-toolkit for its `styles.tailwind` build option.');
      addToolkitStyles(builder, answers.bundler, 'tailwind');
      return;
    }

    builder
      // Tailwind 4 is compiled by its own CLI rather than through PostCSS, because the standalone bundlers do not
      // All reach PostCSS. Compiling first means every bundler receives ordinary, already-expanded CSS. It also drops
      // Autoprefixer and the JavaScript config v3 needed.
      .addPackage('@tailwindcss/cli')
      .addDepcheckIgnore('@tailwindcss/cli', 'run as a CLI by `scripts/build-styles.ts`.')
      .addScript('build:styles')
      .addFiles([
        'scripts/build-styles.ts',
        'src/styles/styles.d.ts'
      ])
      .addPartial('tailwind-cli');
    // What each bundler needs to carry ORDINARY css, which is all it ever sees: esbuild loads it natively, and the
    // Other four keep the plumbing that extracts it. No PostCSS anywhere -- the CLI has already run by the time any of
    // Them look at the file.
    if (answers.bundler === 'rollup') {
      builder
        .addPackage('rollup-plugin-postcss')
        .addPartial('rollup-postcss');
    }
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('css-loader')
        .addDepcheckIgnore('css-loader', 'named as a loader string in `scripts/webpack.config.ts`.')
        .addPackage('mini-css-extract-plugin')
        .addPartial('webpack-css-extract');
    }
  }
}
