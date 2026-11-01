import type { Answers } from '../../answers/answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

export class BugAndFeature extends FeatureOption {
  public constructor() {
    super({ promptHint: 'Bug report and feature request templates', promptLabel: 'Bug & Feature', settingValue: 'bug-and-feature' });
  }

  // The real plugins' names, underscores and all. They used to be emitted as `bug-report.yml` and
  // `feature-request.yml`, because any `_` in a basename was read as the partial marker and the render
  // Loop silently skipped both forms; `isPartialTemplatePath` now reads only a kebab-case tail as one.
  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addFiles([
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      '.github/ISSUE_TEMPLATE/config.yml',
      '.github/ISSUE_TEMPLATE/feature_request.yml'
    ]);

    // The `Report a bug` command of obsidian-lib opens the bug form above, prefilled, so a framework preset
    // Registers it exactly when the form exists, and its README names it. `standalone` has no obsidian-lib to register it from.
    if (isFrameworkPreset(answers.preset)) {
      builder.addPartial('has-bug-report-command');
    }
  }
}
