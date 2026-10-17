import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class Parcel extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Zero-config bundler', promptLabel: 'Parcel', settingValue: 'parcel' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    // On the framework presets obsidian-dev-toolkit runs parcel through its JavaScript API, with a `.parcelrc` of its
    // Own that carries the resolver, namer, transformer and optimizer an Obsidian plugin needs.
    if (isFrameworkPreset(answers.preset)) {
      builder
        .addPackage('@parcel/core')
        .addPackage('@parcel/config-default')
        .addDepcheckIgnore('@parcel/config-default', 'extended by name by the `.parcelrc` obsidian-dev-toolkit writes.')
        .addPackage('@parcel/plugin')
        .addDepcheckIgnore('@parcel/plugin', 'the base of the parcel plugins obsidian-dev-toolkit registers; nothing here imports it.')
        .addPartial('parcel-adapter');
      return;
    }

    builder
      .addPackage('parcel')
      .addDepcheckIgnore('parcel', 'run as a CLI by the build script.')
      .addPackage('@parcel/config-default')
      .addDepcheckIgnore('@parcel/config-default', 'extended by name in `.parcelrc`.')
      // Only Parcel needs a plugin package, and it needs it three times: its resolver is the only way to
      // Mark the modules Obsidian supplies at runtime as external, its namer the only way to name the
      // Emitted stylesheet, and a transformer the only way to keep a dynamic `import()` out of a chunk of
      // Its own. Every other bundler takes a plain `external` list, an output-name option and an
      // Inline-dynamic-imports option in its config.
      .addPackage('@parcel/plugin')
      .addFiles([
        '.parcelrc',
        'parcel-namer-obsidian.cjs',
        'parcel-resolver-obsidian.cjs',
        'parcel-transformer-inline-imports.cjs'
      ])
      .addPartial('parcel-targets')
      .addPartial('cli-bundler');
  }
}
