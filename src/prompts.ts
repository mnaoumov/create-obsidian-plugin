import {
  cancel,
  log
} from '@clack/prompts';
import { styleText } from 'node:util';

import type { Answers } from './answers.ts';
import type { FeatureOption } from './feature-option.ts';

import { select } from './clack-select.ts';
import { text } from './clack-text.ts';
import { GoBackError } from './clack-utils.ts';
import {
  validatePluginDescription,
  validatePluginId,
  validatePluginName
} from './directory-constraints.ts';
import {
  API_SUBSET_OPTIONS,
  promptApiSubset
} from './features/api-subset/index.ts';
import {
  BUNDLER_OPTIONS,
  promptBundler
} from './features/bundler/index.ts';
import {
  COMMIT_LINTING_OPTIONS,
  promptCommitLinting
} from './features/commit-linting/index.ts';
import {
  COVERAGE_BADGE_OPTIONS,
  promptCoverageBadge
} from './features/coverage-badge/index.ts';
import {
  E2E_TEST_RUNNER_OPTIONS,
  promptE2eTestRunner
} from './features/e2e-test-runner/index.ts';
import {
  EDITOR_EXTENSIONS_OPTIONS,
  promptEditorExtensions
} from './features/editor-extensions/index.ts';
import {
  FORMATTER_OPTIONS,
  promptFormatter
} from './features/formatter/index.ts';
import {
  asksFundingUsername,
  promptFundingPlatform,
  validateFundingUsername
} from './features/funding-platform/index.ts';
import {
  GITHUB_ACTIONS_OPTIONS,
  promptGitHubActions
} from './features/git-hub-actions/index.ts';
import {
  GITHUB_ISSUE_TEMPLATES_OPTIONS,
  promptGitHubIssueTemplates
} from './features/git-hub-issue-templates/index.ts';
import {
  HOT_RELOAD_OPTIONS,
  promptHotReload
} from './features/hot-reload/index.ts';
import {
  INTERNATIONALIZATION_OPTIONS,
  promptInternationalization
} from './features/internationalization/index.ts';
import {
  LINTER_OPTIONS,
  promptLinter
} from './features/linter/index.ts';
import {
  MARKDOWN_LINTER_OPTIONS,
  promptMarkdownLinter
} from './features/markdown-linter/index.ts';
import {
  PACKAGE_MANAGER_OPTIONS,
  promptPackageManager
} from './features/package-manager/index.ts';
import {
  PLATFORM_SUPPORT_OPTIONS,
  promptPlatformSupport
} from './features/platform-support/index.ts';
import { promptPreset } from './features/preset/index.ts';
import { isOfficialSamplePreset } from './features/preset/official-sample.ts';
import {
  promptSpellChecker,
  SPELL_CHECKER_OPTIONS
} from './features/spell-checker/index.ts';
import {
  promptStyling,
  STYLING_OPTIONS
} from './features/styling/index.ts';
import {
  promptTestRunner,
  TEST_RUNNER_OPTIONS
} from './features/test-runner/index.ts';
import {
  promptUiFramework,
  UI_FRAMEWORK_OPTIONS
} from './features/ui-framework/index.ts';
import {
  promptWasmSupport,
  WASM_SUPPORT_OPTIONS
} from './features/wasm-support/index.ts';

/**
 * The answer every question behind the `Tooling` question takes on "Use recommended defaults".
 */
interface DefaultTooling {
  apiSubset: string;
  bundler: string;
  commitLinting: string;
  coverageBadge: string;
  e2eTestRunner: string;
  editorExtensions: string;
  formatter: string;
  gitHubActions: string;
  gitHubIssueTemplates: string;
  hotReload: string;
  internationalization: string;
  linter: string;
  markdownLinter: string;
  packageManager: string;
  platformSupport: string;
  spellChecker: string;
  styling: string;
  testRunner: string;
  uiFramework: string;
  wasmSupport: string;
}

interface PromptStep {
  defaultValue: (answers: StepAnswers) => string;
  key: string;
  prompt: (savedValue: string, answers: StepAnswers) => Promise<string>;
  skip?: (answers: StepAnswers) => boolean;
}

type StepAnswers = Map<string, string>;

/**
 * A question behind `Tooling` whose saved answer differs from the recommended one.
 */
interface ToolingChange {
  question: string;
  recommended: string;
  saved: string;
}

type ToolingKey = keyof DefaultTooling;

interface ToolingQuestion {
  message: string;
  options: readonly FeatureOption[];
}

/**
 * How many changes a `Tooling` hint names before it says how many more there are.
 */
const MAX_HINTED_CHANGES = 3;

/**
 * Every question behind `Tooling`, in the order they are asked, with the message and options each one prompts with.
 *
 * It is what lets the `Tooling` question say, on an update, which saved answers each of its options keeps or changes.
 */
/* eslint-disable perfectionist/sort-objects -- The order the questions are asked in, which the hints follow. */
const TOOLING_QUESTIONS: Readonly<Record<ToolingKey, ToolingQuestion>> = {
  bundler: { message: 'Bundler', options: BUNDLER_OPTIONS },
  uiFramework: { message: 'UI framework', options: UI_FRAMEWORK_OPTIONS },
  linter: { message: 'Linter', options: LINTER_OPTIONS },
  formatter: { message: 'Formatter', options: FORMATTER_OPTIONS },
  spellChecker: { message: 'Spell checker', options: SPELL_CHECKER_OPTIONS },
  markdownLinter: { message: 'Markdown linter', options: MARKDOWN_LINTER_OPTIONS },
  testRunner: { message: 'Unit testing', options: TEST_RUNNER_OPTIONS },
  e2eTestRunner: { message: 'E2E testing', options: E2E_TEST_RUNNER_OPTIONS },
  editorExtensions: { message: 'Editor extensions', options: EDITOR_EXTENSIONS_OPTIONS },
  styling: { message: 'Styling', options: STYLING_OPTIONS },
  wasmSupport: { message: 'WebAssembly support', options: WASM_SUPPORT_OPTIONS },
  commitLinting: { message: 'Commit linting', options: COMMIT_LINTING_OPTIONS },
  hotReload: { message: 'Hot reload', options: HOT_RELOAD_OPTIONS },
  internationalization: { message: 'Internationalization', options: INTERNATIONALIZATION_OPTIONS },
  gitHubActions: { message: 'GitHub Actions', options: GITHUB_ACTIONS_OPTIONS },
  gitHubIssueTemplates: { message: 'GitHub issue templates', options: GITHUB_ISSUE_TEMPLATES_OPTIONS },
  coverageBadge: { message: 'Coverage badge', options: COVERAGE_BADGE_OPTIONS },
  apiSubset: { message: 'Obsidian API subset', options: API_SUBSET_OPTIONS },
  packageManager: { message: 'Package manager', options: PACKAGE_MANAGER_OPTIONS },
  platformSupport: { message: 'Platform support', options: PLATFORM_SUPPORT_OPTIONS }
};
/* eslint-enable perfectionist/sort-objects -- The order the questions are asked in, which the hints follow. */

/**
 * The presets that ask the `apiSubset` question. The docs showcase IS the All-in-one Framework project, so it takes it too.
 */
const API_SUBSET_PRESETS = ['all-in-one', 'docs-showcase'];

/**
 * The id every other default is derived from, and the one the `--yes` path ships.
 *
 * It has to pass {@link validatePluginId} itself: it used to be `my-awesome-plugin`, which the Community
 * directory rejects for ending with `plugin` -- so the non-interactive path generated a plugin that could
 * never be listed, under an id that can never be changed once published.
 */
const DEFAULT_PLUGIN_ID = 'my-awesome-helper';

export function getDefaultAnswers(defaults?: Partial<Answers>): Answers {
  const pluginId = defaults?.pluginId ?? DEFAULT_PLUGIN_ID;
  const base = getDefaultAnswersBase(pluginId);
  if (!defaults) {
    return base;
  }
  // The handle defaults to the GitHub username, as the prompt's own default does.
  const overrides: Record<string, unknown> = { fundingUsername: defaults.authorGitHubName ?? base.fundingUsername };
  for (const [key, value] of Object.entries(defaults)) {
    if (value !== undefined) {
      overrides[key] = value;
    }
  }
  return { ...base, ...overrides as Partial<Answers> };
}

/**
 * The display name derived from a plugin id: each hyphen-separated word capitalized.
 */
export function makePluginName(pluginId: string): string {
  return extractWords(pluginId).join(' ');
}

/**
 * Asks every question, each starting from its answer in `defaults`, and skips the ones `supplied` answers.
 *
 * The two are separate because an update seeds every prompt from the saved answers while only the flags
 * given on this run count as answered: passing the saved answers as `supplied` too skipped every question,
 * so "change any settings?" asked nothing and returned the saved answers unchanged.
 */
export async function promptAnswers(defaults?: Partial<Answers>, supplied: Partial<Answers> = defaults ?? {}): Promise<Answers> {
  showHotkeyHints();

  const defaultTooling = getDefaultTooling();
  const steps = skipSuppliedAnswers(buildPromptSteps(defaults ?? {}, supplied, defaultTooling), supplied);
  const answers = await runPromptSteps(steps);

  return buildAnswers(answers, defaultTooling);
}

export function validateNotEmpty(value: string | undefined): string | undefined {
  if (!value) {
    return 'Should not be empty';
  }
  return undefined;
}

function asksApiSubset(preset: string | undefined): boolean {
  return API_SUBSET_PRESETS.includes(preset ?? '');
}

function buildAnswers(answers: StepAnswers, defaultTooling: DefaultTooling): Answers {
  function get(key: string, fallback: string): string {
    return answers.get(key) ?? fallback;
  }

  const pluginId = get('pluginId', DEFAULT_PLUGIN_ID);

  return {
    apiSubset: get('apiSubset', defaultTooling.apiSubset),
    authorGitHubName: get('authorGitHubName', 'johndoe'),
    authorName: get('authorName', 'John Doe'),
    bundler: get('bundler', defaultTooling.bundler),
    commitLinting: get('commitLinting', defaultTooling.commitLinting),
    coverageBadge: get('coverageBadge', defaultTooling.coverageBadge),
    currentYear: new Date().getFullYear(),
    defaultBranch: get('defaultBranch', 'main'),
    e2eTestRunner: get('e2eTestRunner', defaultTooling.e2eTestRunner),
    editorExtensions: get('editorExtensions', defaultTooling.editorExtensions),
    formatter: get('formatter', defaultTooling.formatter),
    fundingPlatform: get('fundingPlatform', 'buy-me-a-coffee'),
    fundingUrl: get('fundingUrl', ''),
    fundingUsername: get('fundingUsername', get('authorGitHubName', 'johndoe')),
    gitHubActions: get('gitHubActions', defaultTooling.gitHubActions),
    gitHubIssueTemplates: get('gitHubIssueTemplates', defaultTooling.gitHubIssueTemplates),
    hotReload: get('hotReload', defaultTooling.hotReload),
    internationalization: get('internationalization', defaultTooling.internationalization),
    linter: get('linter', defaultTooling.linter),
    markdownLinter: get('markdownLinter', defaultTooling.markdownLinter),
    obsidianConfigFolder: get('obsidianConfigFolder', ''),
    packageManager: get('packageManager', defaultTooling.packageManager),
    platformSupport: get('platformSupport', defaultTooling.platformSupport),
    pluginDescription: get('pluginDescription', 'Does something awesome.'),
    pluginId,
    pluginName: get('pluginName', makePluginName(pluginId)),
    preset: get('preset', 'all-in-one'),
    spellChecker: get('spellChecker', defaultTooling.spellChecker),
    styling: get('styling', defaultTooling.styling),
    testRunner: get('testRunner', defaultTooling.testRunner),
    uiFramework: get('uiFramework', defaultTooling.uiFramework),
    wasmSupport: get('wasmSupport', defaultTooling.wasmSupport)
  };
}

function buildPromptSteps(d: Partial<Answers>, supplied: Partial<Answers>, defaultTooling: DefaultTooling): PromptStep[] {
  function isCustomize(answers: StepAnswers): boolean {
    return answers.get('toolingMode') === 'customize';
  }

  function skipUnlessCustomize(answers: StepAnswers): boolean {
    return !isCustomize(answers);
  }

  /**
   * The answer a question behind `Tooling` starts from, or takes when it is not asked.
   *
   * "Use recommended defaults" takes the recommended answer over a saved one, which is what its label says. Only
   * "Keep current tooling" and "Customize" start from the saved answer. A flag given on this run wins over both.
   */
  function tooling(key: ToolingKey, answers: StepAnswers): string {
    if (answers.get('toolingMode') === 'defaults' && supplied[key] === undefined) {
      return defaultTooling[key];
    }
    return d[key] ?? defaultTooling[key];
  }

  function changes(answers: StepAnswers): ToolingChange[] {
    return findToolingChanges(d, supplied, defaultTooling, answers.get('preset'));
  }

  return [
    {
      defaultValue: () => d.preset ?? 'all-in-one',
      key: 'preset',
      prompt: (saved): Promise<string> => promptPreset(saved)
    },
    {
      // A skipped `Tooling` keeps what was saved, which is what the question offers first when there is any.
      defaultValue: (answers) => changes(answers).length > 0 ? 'keep' : 'defaults',
      key: 'toolingMode',
      prompt: (saved, answers): Promise<string> => promptToolingMode(saved, changes(answers)),
      // The official sample is upstream's tooling as it is, so there is nothing to customize.
      skip: (answers) => answers.get('preset') === 'demo' || isOfficialSamplePreset(answers.get('preset'))
    },
    {
      defaultValue: (answers) => answers.get('preset') === 'demo' ? 'esbuild' : tooling('bundler', answers),
      key: 'bundler',
      prompt: (saved): Promise<string> => promptBundler(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => answers.get('preset') === 'demo' ? 'none' : tooling('uiFramework', answers),
      key: 'uiFramework',
      prompt: (saved): Promise<string> => promptUiFramework(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('linter', answers),
      key: 'linter',
      prompt: (saved): Promise<string> => promptLinter(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('formatter', answers),
      key: 'formatter',
      prompt: (saved): Promise<string> => promptFormatter(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('spellChecker', answers),
      key: 'spellChecker',
      prompt: (saved): Promise<string> => promptSpellChecker(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('markdownLinter', answers),
      key: 'markdownLinter',
      prompt: (saved): Promise<string> => promptMarkdownLinter(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('testRunner', answers),
      key: 'testRunner',
      prompt: (saved): Promise<string> => promptTestRunner(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('e2eTestRunner', answers),
      key: 'e2eTestRunner',
      prompt: (saved): Promise<string> => promptE2eTestRunner(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('editorExtensions', answers),
      key: 'editorExtensions',
      prompt: (saved): Promise<string> => promptEditorExtensions(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('styling', answers),
      key: 'styling',
      prompt: (saved): Promise<string> => promptStyling(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('wasmSupport', answers),
      key: 'wasmSupport',
      prompt: (saved): Promise<string> => promptWasmSupport(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('commitLinting', answers),
      key: 'commitLinting',
      prompt: (saved): Promise<string> => promptCommitLinting(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('hotReload', answers),
      key: 'hotReload',
      prompt: (saved): Promise<string> => promptHotReload(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('internationalization', answers),
      key: 'internationalization',
      prompt: (saved): Promise<string> => promptInternationalization(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('gitHubActions', answers),
      key: 'gitHubActions',
      prompt: (saved): Promise<string> => promptGitHubActions(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('gitHubIssueTemplates', answers),
      key: 'gitHubIssueTemplates',
      prompt: (saved): Promise<string> => promptGitHubIssueTemplates(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('coverageBadge', answers),
      key: 'coverageBadge',
      prompt: (saved): Promise<string> => promptCoverageBadge(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('apiSubset', answers),
      key: 'apiSubset',
      prompt: (saved): Promise<string> => promptApiSubset(saved),
      skip: (answers) => !(isCustomize(answers) && asksApiSubset(answers.get('preset')))
    },
    {
      defaultValue: (answers) => tooling('packageManager', answers),
      key: 'packageManager',
      prompt: (saved): Promise<string> => promptPackageManager(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => tooling('platformSupport', answers),
      key: 'platformSupport',
      prompt: (saved): Promise<string> => promptPlatformSupport(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.pluginId ?? '',
      key: 'pluginId',
      prompt: (saved): Promise<string> =>
        text({
          defaultValue: saved || undefined,
          message: 'Plugin id (lowercase, hyphens allowed)',
          placeholder: saved || DEFAULT_PLUGIN_ID,
          validate: validatePluginId
        })
    },
    {
      defaultValue: (answers) => d.pluginName ?? makePluginName(answers.get('pluginId') ?? DEFAULT_PLUGIN_ID),
      key: 'pluginName',
      prompt: (saved): Promise<string> => promptPluginName(saved)
    },
    {
      defaultValue: () => d.pluginDescription ?? 'Does something awesome.',
      key: 'pluginDescription',
      prompt: (saved): Promise<string> => promptPluginDescription(saved)
    },
    {
      defaultValue: () => d.authorName ?? 'John Doe',
      key: 'authorName',
      prompt: (saved): Promise<string> =>
        text({
          defaultValue: saved,
          message: 'Your full name',
          placeholder: saved,
          validate: validateNotEmpty
        })
    },
    {
      defaultValue: () => d.authorGitHubName ?? 'johndoe',
      key: 'authorGitHubName',
      prompt: (saved): Promise<string> =>
        text({
          defaultValue: saved,
          message: 'Your GitHub username',
          placeholder: saved,
          validate: validateNotEmpty
        })
    },
    {
      defaultValue: () => d.defaultBranch ?? 'main',
      key: 'defaultBranch',
      prompt: (saved): Promise<string> =>
        text({
          defaultValue: saved,
          message: 'Default branch name. `git init` creates it, and the CI workflow triggers on it.',
          placeholder: saved,
          validate: validateNotEmpty
        })
    },
    // Asked outside Customize: it is a fact about the author, not a tooling choice, and choosing `none`
    // Here is the only way the recommended-defaults path has to opt out of funding altogether.
    {
      defaultValue: () => d.fundingPlatform ?? 'buy-me-a-coffee',
      key: 'fundingPlatform',
      prompt: (saved): Promise<string> => promptFundingPlatform(saved)
    },
    {
      defaultValue: (answers) => d.fundingUsername ?? answers.get('authorGitHubName') ?? 'johndoe',
      key: 'fundingUsername',
      prompt: (saved): Promise<string> =>
        text({
          defaultValue: saved,
          message: 'Your username on that funding platform',
          placeholder: saved,
          validate: validateFundingUsername
        }),
      skip: (answers) => !asksFundingUsername(answers.get('fundingPlatform'))
    },
    {
      defaultValue: () => d.fundingUrl ?? '',
      key: 'fundingUrl',
      prompt: (saved): Promise<string> =>
        text({
          defaultValue: saved || undefined,
          message: 'Funding URL',
          placeholder: saved || 'https://example.com/support-me',
          validate: validateNotEmpty
        }),
      skip: (answers) => answers.get('fundingPlatform') !== 'custom'
    },
    {
      defaultValue: () => d.obsidianConfigFolder ?? '',
      key: 'obsidianConfigFolder',
      prompt: (saved): Promise<string> =>
        text({
          defaultValue: saved || undefined,
          message: 'Path to test vault config folder (.obsidian, by default, but it is configurable in Obsidian settings). This enables auto-update of your plugin in your test vault during dev. Leave empty if you prefer to update the plugin manually.',
          placeholder: saved || 'path/to/test-vault/.obsidian'
        }),
      // Upstream builds into the project folder and copies nothing into a vault.
      skip: (answers) => isOfficialSamplePreset(answers.get('preset'))
    }
  ];
}

function describeChanges(changes: readonly ToolingChange[], describe: (change: ToolingChange) => string): string {
  const named = changes.slice(0, MAX_HINTED_CHANGES).map(describe).join(', ');
  const rest = changes.length - MAX_HINTED_CHANGES;
  return rest > 0 ? `${named}, and ${String(rest)} more` : named;
}

function extractWords(pluginId: string): string[] {
  return pluginId.split('-').map((w) => (w[0] ?? '').toUpperCase() + w.slice(1));
}

/**
 * The questions behind `Tooling` whose saved answer differs from the recommended one, in the order they are asked.
 *
 * A question a flag answered on this run is left out, since no option changes it, and so is `apiSubset` under a
 * preset that does not ask it.
 */
function findToolingChanges(
  d: Partial<Answers>,
  supplied: Partial<Answers>,
  defaultTooling: DefaultTooling,
  preset: string | undefined
): ToolingChange[] {
  const changes: ToolingChange[] = [];
  for (const [key, question] of Object.entries(TOOLING_QUESTIONS) as [ToolingKey, ToolingQuestion][]) {
    const saved = d[key];
    if (saved === undefined || supplied[key] !== undefined || saved === defaultTooling[key]) {
      continue;
    }
    if (key === 'apiSubset' && !asksApiSubset(preset)) {
      continue;
    }
    changes.push({
      question: question.message,
      recommended: getOptionLabel(question, defaultTooling[key]),
      saved: getOptionLabel(question, saved)
    });
  }
  return changes;
}

function getDefaultAnswersBase(pluginId: string): Answers {
  return {
    ...getDefaultTooling(),
    authorGitHubName: 'johndoe',
    authorName: 'John Doe',
    currentYear: new Date().getFullYear(),
    defaultBranch: 'main',
    fundingPlatform: 'buy-me-a-coffee',
    fundingUrl: '',
    fundingUsername: 'johndoe',
    obsidianConfigFolder: '',
    pluginDescription: 'Does something awesome.',
    pluginId,
    pluginName: makePluginName(pluginId),
    preset: 'all-in-one'
  };
}

function getDefaultTooling(): DefaultTooling {
  return {
    apiSubset: 'official',
    bundler: 'esbuild',
    commitLinting: 'conventional-commits',
    coverageBadge: 'none',
    e2eTestRunner: 'none',
    editorExtensions: 'none',
    formatter: 'dprint',
    gitHubActions: 'ci-and-release',
    gitHubIssueTemplates: 'bug-and-feature',
    hotReload: 'obsidian-cli',
    internationalization: 'none',
    linter: 'eslint',
    markdownLinter: 'markdownlint',
    packageManager: 'npm',
    platformSupport: 'desktop-only',
    spellChecker: 'cspell',
    styling: 'scss',
    testRunner: 'vitest',
    uiFramework: 'none',
    wasmSupport: 'none'
  };
}

function getOptionLabel(question: ToolingQuestion, value: string): string {
  return question.options.find((option) => option.settingValue === value)?.promptLabel ?? value;
}

function promptPluginDescription(saved: string): Promise<string> {
  const value = saved || undefined;
  return text({
    defaultValue: value,
    message: 'Plugin description',
    placeholder: value ?? 'Does something awesome.',
    validate: validatePluginDescription
  });
}

function promptPluginName(saved: string): Promise<string> {
  const value = saved || undefined;
  return text({
    defaultValue: value,
    message: 'Plugin display name',
    placeholder: value ?? makePluginName(DEFAULT_PLUGIN_ID),
    validate: validatePluginName
  });
}

/**
 * Asks how to answer the questions behind `Tooling`.
 *
 * When saved answers differ from the recommended ones, which only an update has, "Keep current tooling" is offered
 * first and names what it keeps, and "Use recommended defaults" names what it changes. Offering only the latter used
 * to keep the saved tooling under a label that said otherwise.
 */
async function promptToolingMode(savedValue: string, changes: readonly ToolingChange[]): Promise<string> {
  const customize = { hint: 'Choose each tool individually', label: 'Customize', value: 'customize' };
  if (changes.length === 0) {
    return select({
      initialValue: savedValue,
      message: 'Tooling',
      options: [
        customize,
        { hint: 'ESLint, dprint, SCSS, Vitest, and more', label: 'Use recommended defaults', value: 'defaults' }
      ]
    });
  }

  return select({
    initialValue: savedValue,
    message: 'Tooling',
    options: [
      { hint: describeChanges(changes, (change) => `${change.question}: ${change.saved}`), label: 'Keep current tooling', value: 'keep' },
      customize,
      {
        hint: describeChanges(changes, (change) => `${change.question}: ${change.saved} -> ${change.recommended}`),
        label: 'Use recommended defaults',
        value: 'defaults'
      }
    ]
  });
}

async function runPromptSteps(steps: PromptStep[]): Promise<StepAnswers> {
  const answers: StepAnswers = new Map();
  let i = 0;

  while (i < steps.length) {
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style -- Cannot use `!` assertion per project rules.
    const step = steps[i] as PromptStep;

    if (step.skip?.(answers)) {
      answers.set(step.key, step.defaultValue(answers));
      i++;
      continue;
    }

    try {
      const savedValue = answers.get(step.key) ?? step.defaultValue(answers);
      answers.set(step.key, await step.prompt(savedValue, answers));
      i++;
    } catch (error: unknown) {
      if (!(error instanceof GoBackError)) {
        throw error;
      }

      answers.delete(step.key);
      i--;

      while (i > 0 && steps[i]?.skip?.(answers)) {
        // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style -- Cannot use `!` assertion per project rules.
        const skippedStep = steps[i] as PromptStep;
        answers.delete(skippedStep.key);
        i--;
      }

      if (i < 0) {
        cancel('Operation cancelled.');
        process.exit(0);
      }
    }
  }

  return answers;
}

function showHotkeyHints(): void {
  function dim(s: string): string {
    return styleText('dim', s);
  }

  function key(s: string): string {
    return styleText('cyan', s);
  }

  log.info([
    `${key('↑↓')} Navigate  ${key('Enter')} Confirm  ${key('Esc')} Go back`,
    `${dim('Text inputs:')} ${key('Tab')}/${key('→')}/${key('End')} Accept suggestion`
  ].join('\n'));
}

/**
 * Marks every question that already has an answer as skipped, so it is not asked again.
 *
 * Only the `skip` predicate needs composing. `runPromptSteps` writes `defaultValue(answers)` for a skipped
 * step, and every step's `defaultValue` reads the supplied answer before its own fallback -- so the
 * supplied value lands in the map by the path that was already there.
 *
 * `!== undefined` rather than a truthiness test: `fundingUrl` and `obsidianConfigFolder` are legitimately
 * empty, and someone who passes `--fundingUrl=` has answered the question.
 */
function skipSuppliedAnswers(steps: PromptStep[], supplied: Partial<Answers>): PromptStep[] {
  return steps.map((step) => ({
    ...step,
    skip: (answers: StepAnswers): boolean => supplied[step.key as keyof Answers] !== undefined || (step.skip?.(answers) ?? false)
  }));
}
