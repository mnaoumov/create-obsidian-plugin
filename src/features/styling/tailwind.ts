import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Tailwind extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Utility-first CSS framework', promptLabel: 'Tailwind CSS', settingValue: 'tailwind' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder
      // Tailwind 4 is compiled by its own CLI rather than through PostCSS. PostCSS is not reachable on
      // Every path this generator emits -- the obsidian-dev-utils presets call that library's esbuild
      // Build, which has no PostCSS step and registers `esbuild-sass-plugin` (whose default filter
      // Claims `.css`, not just `.scss`) ahead of the `customEsbuildPlugins` seam a project can add to.
      // Compiling first means every bundler receives ordinary, already-expanded CSS and the question
      // Does not arise. It also drops autoprefixer and the JavaScript config v3 needed.
      .addPackage('@tailwindcss/cli')
      .addPackage('tailwindcss')
      .addScript('build:styles')
      .addFiles([
        'scripts/build-styles.ts',
        'src/styles/main.css',
        'src/styles/styles.d.ts'
      ]);
    // What each bundler needs to carry ORDINARY css, which is all it ever sees now: esbuild loads it
    // Natively, and the other four keep the plumbing that extracts it. No PostCSS anywhere -- the CLI
    // Has already run by the time any of them look at the file.
    if (answers.bundler === 'rollup') {
      builder.addPackage('rollup-plugin-postcss');
    }
    if (answers.bundler === 'webpack') {
      builder
        .addPackage('css-loader')
        .addPackage('mini-css-extract-plugin')
        .addPartial('webpack-css-extract');
    }
  }
}
