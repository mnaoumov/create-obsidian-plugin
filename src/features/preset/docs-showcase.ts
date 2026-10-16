import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { AllInOne } from './all-in-one.ts';

/** The `preset` value of the Developer docs showcase. */
export const DOCS_SHOWCASE_PRESET = 'docs-showcase';

/**
 * The All-in-one Framework project, plus every code block of the Obsidian developer docs as a runnable command.
 *
 * The blocks themselves are not templates: `npm run sync:docs-showcase` extracts, wraps and type-checks them into
 * `templates/docs-showcase/files`, and `copyTemplates` writes that folder into the project as it is. What this option
 * contributes is the wiring around it: the `all-in-one` partials, the `docs-showcase` partials that call
 * `registerDocsShowcase` and keep the project's own tooling out of `src/docs`, the CodeMirror packages the blocks
 * import, and the `build:compile:typescript` step that type-checks the folder under its own `tsconfig.json`.
 */
export class DocsShowcase extends FeatureOption {
  public constructor() {
    super({
      promptHint: 'The All-in-one Framework project, plus every code block of the Obsidian developer docs as a command you can run',
      promptLabel: 'Developer docs showcase',
      settingValue: DOCS_SHOWCASE_PRESET
    });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    new AllInOne().configure(builder, answers);
    builder
      // The project IS the All-in-one Framework one, so it takes that preset's partials whole.
      .addPartial('all-in-one')
      // The blocks import CodeMirror directly: the editor extension pages are written against it.
      .addPackage('@codemirror/language')
      .addPackage('@codemirror/state')
      .addPackage('@codemirror/view')
      // The toolkit's `build:compile` runs this script in place of its own TypeScript step when the project has one.
      .addScript('build:compile:typescript')
      .addFiles(['scripts/build-compile-typescript.ts']);

    // The suite that runs every block's command in a real Obsidian is a vitest suite of the desktop integration
    // Project, which only the vitest answer configures.
    if (answers.testRunner === 'vitest') {
      builder.addFiles(['src/docs-showcase.desktop.integration.test.ts']);
    }
  }
}
