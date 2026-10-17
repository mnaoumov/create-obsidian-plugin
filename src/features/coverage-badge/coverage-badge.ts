import type { Answers } from '../../answers.ts';
import type { TemplateBuilder } from '../../template-builder.ts';

import { FeatureOption } from '../../feature-option.ts';
import { isFrameworkPreset } from '../preset/is-framework-preset.ts';

/**
 * The coverage badge every real plugin carries last on its README badge line.
 *
 * Where it can be measured it is: on a framework preset with a CI workflow and a unit test runner, obsidian-dev-toolkit's
 * CI workflow renders it from the gate's `test:coverage` report and publishes it to the `badges` branch, and the README
 * shows that file. Anywhere else it is the `coverage: 100%` claim the real plugins carry, which shields.io draws from
 * the URL rather than from a report. Either way it is an answer and not a default: a fresh project does not hold 100%
 * coverage until its author makes it.
 */
export class CoverageBadge extends FeatureOption {
  public constructor() {
    super({ promptHint: 'A coverage README badge, measured by CI where the project has one', promptLabel: 'Coverage badge', settingValue: 'coverage-badge' });
  }

  public override configure(builder: TemplateBuilder, answers: Answers): void {
    const repoUrl = `https://github.com/${answers.authorGitHubName}/obsidian-${answers.pluginId}`;
    if (!isMeasured(answers)) {
      builder.addBadge(`[![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](${repoUrl})`);
      return;
    }

    builder
      .addPartial('measured-coverage-badge')
      .addBadge(
        `[![Coverage](https://raw.githubusercontent.com/${answers.authorGitHubName}/obsidian-${answers.pluginId}/badges/coverage.svg)](${repoUrl}/actions/workflows/ci.yml)`
      );
  }
}

const CI_ANSWERS = new Set(['ci', 'ci-and-release']);
const MEASURING_TEST_RUNNERS = new Set(['jest', 'vitest']);

/**
 * Whether the project's CI can measure the coverage the badge shows.
 *
 * @param answers - The answers.
 * @returns Whether obsidian-dev-toolkit's CI workflow runs and the gate writes a coverage report.
 */
function isMeasured(answers: Answers): boolean {
  return isFrameworkPreset(answers.preset) && CI_ANSWERS.has(answers.gitHubActions) && MEASURING_TEST_RUNNERS.has(answers.testRunner);
}
