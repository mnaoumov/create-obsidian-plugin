import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

export class Vite extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Modern dev server with HMR', promptLabel: 'Vite', settingValue: 'vite' });
  }

  public override configure(builder: TemplateBuilder): void {
    builder
      .addPackage('vite')
      .addFiles([
        'vite.config.ts',
        'scripts/vite.config.ts'
      ]);

    // Marks this as a bundler driven from the command line, so it shares one build script with the
    // Other three instead of each carrying a near-identical copy. esbuild is the exception: it is
    // Driven through its API, and obsidian-dev-utils supplies a build for it.
    builder.addPartial('cli-bundler');
  }
}
