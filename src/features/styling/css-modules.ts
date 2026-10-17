import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';
import { addToolkitStyles } from './toolkit-styles.ts';

export class CssModules extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Scoped CSS with .module.css files', promptLabel: 'CSS Modules', settingValue: 'css-modules' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    // The sample command applies a class from the module. A bare side-effect import of a CSS module is
    // Not enough: vite drops an import whose class names nothing reads, and its CSS with it.
    // `css-modules.d.ts` is emitted on every preset. On the framework presets obsidian-dev-toolkit's
    // `types/styles` declares the same type, and the file says why its pattern does not collide with that.
    builder.addFiles(['src/styles/css-modules.d.ts', 'src/styles/main.module.css', 'src/styles/sample-css-module-command.ts']);
    if (isFrameworkPreset(answers.preset)) {
      addToolkitStyles(builder, answers.bundler, 'cssModules');
      return;
    }

    // Rollup cannot import a stylesheet at all without a plugin. The emitted `src/main.ts` imports
    // `main.module.css`, and rollup answered with "Expression expected (Note that you need plugins to
    // Import files that are not JavaScript)". rollup-plugin-postcss scopes `*.module.css` by default
    // And leaves an ordinary stylesheet alone, which is what a second, forced styling answer needs.
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
