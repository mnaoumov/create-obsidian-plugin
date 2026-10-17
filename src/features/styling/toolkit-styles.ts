import type { TemplateBuilder } from '../../template-builder.ts';

/**
 * What a styling answer contributes on a framework preset, where obsidian-dev-toolkit's adapters compile the stylesheets.
 *
 * `styles` set at all compiles plain CSS, so the rollup and webpack adapters stop needing a CSS plugin of the
 * project's. On webpack the adapter adds the rule and applies `mini-css-extract-plugin`, from the project's own
 * install. The stylesheet imports' types come from the toolkit.
 *
 * @param builder - The builder.
 * @param bundler - The bundler answer.
 * @param flag - The `styles` flag the answer turns on, if any.
 */
export function addToolkitStyles(builder: TemplateBuilder, bundler: string, flag?: string): void {
  builder
    .addBuildStyles(flag)
    .addPartial('toolkit-styles');
  if (bundler === 'webpack') {
    builder
      .addPackage('css-loader')
      .addDepcheckIgnore('css-loader', 'resolved by name by obsidian-dev-toolkit\'s webpack plugin for the stylesheet rule.')
      .addPackage('mini-css-extract-plugin')
      .addDepcheckIgnore('mini-css-extract-plugin', 'applied by obsidian-dev-toolkit\'s webpack plugin to extract `styles.css`.');
  }
}
