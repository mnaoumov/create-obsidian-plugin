import {
  cancel,
  log
} from '@clack/prompts';
import { styleText } from 'node:util';

import type { Answers } from './answers.ts';

import { select } from './clack-select.ts';
import { text } from './clack-text.ts';
import { GoBackError } from './clack-utils.ts';
import {
  validatePluginDescription,
  validatePluginId,
  validatePluginName
} from './directory-constraints.ts';
import { promptApiSubset } from './features/api-subset/index.ts';
import { promptBundler } from './features/bundler/index.ts';
import { promptCommitLinting } from './features/commit-linting/index.ts';
import { promptCoverageBadge } from './features/coverage-badge/index.ts';
import { promptE2eTestRunner } from './features/e2e-test-runner/index.ts';
import { promptEditorExtensions } from './features/editor-extensions/index.ts';
import { promptFormatter } from './features/formatter/index.ts';
import {
  asksFundingUsername,
  promptFundingPlatform,
  validateFundingUsername
} from './features/funding-platform/index.ts';
import { promptGitHubActions } from './features/git-hub-actions/index.ts';
import { promptGitHubIssueTemplates } from './features/git-hub-issue-templates/index.ts';
import { promptHotReload } from './features/hot-reload/index.ts';
import { promptInternationalization } from './features/internationalization/index.ts';
import { promptLinter } from './features/linter/index.ts';
import { promptMarkdownLinter } from './features/markdown-linter/index.ts';
import { promptPackageManager } from './features/package-manager/index.ts';
import { promptPlatformSupport } from './features/platform-support/index.ts';
import { promptPreset } from './features/preset/index.ts';
import { promptSpellChecker } from './features/spell-checker/index.ts';
import { promptStyling } from './features/styling/index.ts';
import { promptTestRunner } from './features/test-runner/index.ts';
import { promptUiFramework } from './features/ui-framework/index.ts';
import { promptWasmSupport } from './features/wasm-support/index.ts';

interface DefaultTooling {
  apiSubset: string;
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
  spellChecker: string;
  styling: string;
  testRunner: string;
  wasmSupport: string;
}

interface PromptStep {
  defaultValue: (answers: StepAnswers) => string;
  key: string;
  prompt: (savedValue: string) => Promise<string>;
  skip?: (answers: StepAnswers) => boolean;
}

type StepAnswers = Map<string, string>;

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

export async function promptAnswers(defaults?: Partial<Answers>): Promise<Answers> {
  showHotkeyHints();

  const defaultTooling = getDefaultTooling();
  const steps = skipSuppliedAnswers(buildPromptSteps(defaults ?? {}, defaultTooling), defaults ?? {});
  const answers = await runPromptSteps(steps);

  return buildAnswers(answers, defaultTooling);
}

export function validateNotEmpty(value: string | undefined): string | undefined {
  if (!value) {
    return 'Should not be empty';
  }
  return undefined;
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
    bundler: get('bundler', 'esbuild'),
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
    packageManager: get('packageManager', 'npm'),
    platformSupport: get('platformSupport', 'desktop-only'),
    pluginDescription: get('pluginDescription', 'Does something awesome.'),
    pluginId,
    pluginName: get('pluginName', makePluginName(pluginId)),
    preset: get('preset', 'enhanced'),
    spellChecker: get('spellChecker', defaultTooling.spellChecker),
    styling: get('styling', defaultTooling.styling),
    testRunner: get('testRunner', defaultTooling.testRunner),
    uiFramework: get('uiFramework', 'none'),
    wasmSupport: get('wasmSupport', defaultTooling.wasmSupport)
  };
}

function buildPromptSteps(d: Partial<Answers>, defaultTooling: DefaultTooling): PromptStep[] {
  function isCustomize(answers: StepAnswers): boolean {
    return answers.get('toolingMode') === 'customize';
  }

  function skipUnlessCustomize(answers: StepAnswers): boolean {
    return !isCustomize(answers);
  }

  return [
    {
      defaultValue: () => d.preset ?? 'enhanced',
      key: 'preset',
      prompt: (saved): Promise<string> => promptPreset(saved)
    },
    {
      defaultValue: () => 'defaults',
      key: 'toolingMode',
      prompt: (): Promise<string> => promptToolingMode(),
      skip: (answers) => answers.get('preset') === 'demo'
    },
    {
      defaultValue: (answers) => answers.get('preset') === 'demo' ? 'esbuild' : (d.bundler ?? 'esbuild'),
      key: 'bundler',
      prompt: (saved): Promise<string> => promptBundler(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: (answers) => answers.get('preset') === 'demo' ? 'none' : (d.uiFramework ?? 'none'),
      key: 'uiFramework',
      prompt: (saved): Promise<string> => promptUiFramework(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.linter ?? defaultTooling.linter,
      key: 'linter',
      prompt: (saved): Promise<string> => promptLinter(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.formatter ?? defaultTooling.formatter,
      key: 'formatter',
      prompt: (saved): Promise<string> => promptFormatter(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.spellChecker ?? defaultTooling.spellChecker,
      key: 'spellChecker',
      prompt: (saved): Promise<string> => promptSpellChecker(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.markdownLinter ?? defaultTooling.markdownLinter,
      key: 'markdownLinter',
      prompt: (saved): Promise<string> => promptMarkdownLinter(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.testRunner ?? defaultTooling.testRunner,
      key: 'testRunner',
      prompt: (saved): Promise<string> => promptTestRunner(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.e2eTestRunner ?? defaultTooling.e2eTestRunner,
      key: 'e2eTestRunner',
      prompt: (saved): Promise<string> => promptE2eTestRunner(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.editorExtensions ?? defaultTooling.editorExtensions,
      key: 'editorExtensions',
      prompt: (saved): Promise<string> => promptEditorExtensions(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.styling ?? defaultTooling.styling,
      key: 'styling',
      prompt: (saved): Promise<string> => promptStyling(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.wasmSupport ?? defaultTooling.wasmSupport,
      key: 'wasmSupport',
      prompt: (saved): Promise<string> => promptWasmSupport(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.commitLinting ?? defaultTooling.commitLinting,
      key: 'commitLinting',
      prompt: (saved): Promise<string> => promptCommitLinting(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.hotReload ?? defaultTooling.hotReload,
      key: 'hotReload',
      prompt: (saved): Promise<string> => promptHotReload(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.internationalization ?? defaultTooling.internationalization,
      key: 'internationalization',
      prompt: (saved): Promise<string> => promptInternationalization(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.gitHubActions ?? defaultTooling.gitHubActions,
      key: 'gitHubActions',
      prompt: (saved): Promise<string> => promptGitHubActions(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.gitHubIssueTemplates ?? defaultTooling.gitHubIssueTemplates,
      key: 'gitHubIssueTemplates',
      prompt: (saved): Promise<string> => promptGitHubIssueTemplates(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.coverageBadge ?? defaultTooling.coverageBadge,
      key: 'coverageBadge',
      prompt: (saved): Promise<string> => promptCoverageBadge(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.apiSubset ?? defaultTooling.apiSubset,
      key: 'apiSubset',
      prompt: (saved): Promise<string> => promptApiSubset(saved),
      skip: (answers) => !(isCustomize(answers) && answers.get('preset') === 'enhanced')
    },
    {
      defaultValue: () => d.packageManager ?? 'npm',
      key: 'packageManager',
      prompt: (saved): Promise<string> => promptPackageManager(saved),
      skip: skipUnlessCustomize
    },
    {
      defaultValue: () => d.platformSupport ?? 'desktop-only',
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
        })
    }
  ];
}

function extractWords(pluginId: string): string[] {
  return pluginId.split('-').map((w) => (w[0] ?? '').toUpperCase() + w.slice(1));
}

function getDefaultAnswersBase(pluginId: string): Answers {
  return {
    ...getDefaultTooling(),
    authorGitHubName: 'johndoe',
    authorName: 'John Doe',
    bundler: 'esbuild',
    currentYear: new Date().getFullYear(),
    defaultBranch: 'main',
    fundingPlatform: 'buy-me-a-coffee',
    fundingUrl: '',
    fundingUsername: 'johndoe',
    obsidianConfigFolder: '',
    packageManager: 'npm',
    platformSupport: 'desktop-only',
    pluginDescription: 'Does something awesome.',
    pluginId,
    pluginName: makePluginName(pluginId),
    preset: 'enhanced',
    uiFramework: 'none'
  };
}

function getDefaultTooling(): DefaultTooling {
  return {
    apiSubset: 'official',
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
    spellChecker: 'cspell',
    styling: 'scss',
    testRunner: 'vitest',
    wasmSupport: 'none'
  };
}

function makePluginName(pluginId: string): string {
  return extractWords(pluginId).join(' ');
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

async function promptToolingMode(): Promise<string> {
  return select({
    initialValue: 'defaults',
    message: 'Tooling',
    options: [
      { hint: 'Choose each tool individually', label: 'Customize', value: 'customize' },
      { hint: 'ESLint, dprint, SCSS, Vitest, and more', label: 'Use recommended defaults', value: 'defaults' }
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
      answers.set(step.key, await step.prompt(savedValue));
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
