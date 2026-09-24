import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';

/**
 * The `coverage: 100%` badge every real plugin carries last on its README badge line.
 *
 * A claim rather than a measurement: shields.io draws it from the URL, not from a coverage report. That
 * is why it is an answer and not a default -- a fresh project does not hold 100% coverage until its
 * author makes it.
 */
export class CoverageBadge extends FeatureOption {
  public constructor() {
    super({ promptHint: 'A "coverage: 100%" README badge', promptLabel: 'Coverage badge', settingValue: 'coverage-badge' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    builder.addBadge(
      `[![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/${answers.authorGitHubName}/obsidian-${answers.pluginId})`
    );
  }
}
