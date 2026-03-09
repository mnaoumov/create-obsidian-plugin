import {
  cancel,
  log
} from '@clack/prompts';
import { styleText } from 'node:util';

import type { Answers } from './Answers.ts';

import { select } from './clack-select.ts';
import { text } from './clack-text.ts';
import { GoBackError } from './clack-utils.ts';
import { promptApiSubset } from './features/ApiSubset/index.ts';
import { promptBundler } from './features/Bundler/index.ts';
import { promptCommitLinting } from './features/CommitLinting/index.ts';
import { promptE2eTestRunner } from './features/E2eTestRunner/index.ts';
import { promptEditorExtensions } from './features/EditorExtensions/index.ts';
import { promptFormatter } from './features/Formatter/index.ts';
import { promptGitHubActions } from './features/GitHubActions/index.ts';
import { promptGitHubFunding } from './features/GitHubFunding/index.ts';
import { promptGitHubIssueTemplates } from './features/GitHubIssueTemplates/index.ts';
import { promptHotReload } from './features/HotReload/index.ts';
import { promptInternationalization } from './features/Internationalization/index.ts';
import { promptLinter } from './features/Linter/index.ts';
import { promptMarkdownLinter } from './features/MarkdownLinter/index.ts';
import { promptPackageManager } from './features/PackageManager/index.ts';
import { promptPlatformSupport } from './features/PlatformSupport/index.ts';
import { promptPreset } from './features/Preset/index.ts';
import { promptSpellChecker } from './features/SpellChecker/index.ts';
import { promptStyling } from './features/Styling/index.ts';
import { promptTestRunner } from './features/TestRunner/index.ts';
import { promptUiFramework } from './features/UiFramework/index.ts';
import { promptWasmSupport } from './features/WasmSupport/index.ts';

interface DefaultTooling {
  apiSubset: string;
  commitLinting: string;
  e2eTestRunner: string;
  editorExtensions: string;
  formatter: string;
  gitHubActions: string;
  gitHubFunding: string;
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

export function getDefaultAnswers(defaults?: Partial<Answers>): Answers {
  const pluginId = defaults?.pluginId ?? 'my-awesome-plugin';
  const base = getDefaultAnswersBase(pluginId);
  if (!defaults) {
    return base;
  }
  const overrides: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(defaults) as [string, unknown][]) {
    if (value !== undefined) {
      overrides[key] = value;
    }
  }
  return { ...base, ...overrides as Partial<Answers> };
}

export async function promptAnswers(defaults?: Partial<Answers>): Promise<Answers> {
  showHotkeyHints();

  const defaultTooling = getDefaultTooling('enhanced');
  const steps = buildPromptSteps(defaults ?? {}, defaultTooling);
  const answers = await runPromptSteps(steps);

  return buildAnswers(answers, defaultTooling);
}

function buildAnswers(answers: StepAnswers, defaultTooling: DefaultTooling): Answers {
  function get(key: string, fallback: string): string {
    return answers.get(key) ?? fallback;
  }

  const pluginId = get('pluginId', 'my-awesome-plugin');

  return {
    apiSubset: get('apiSubset', defaultTooling.apiSubset),
    authorGitHubName: get('authorGitHubName', 'johndoe'),
    authorName: get('authorName', 'John Doe'),
    bundler: get('bundler', 'esbuild'),
    commitLinting: get('commitLinting', defaultTooling.commitLinting),
    currentYear: new Date().getFullYear(),
    e2eTestRunner: get('e2eTestRunner', defaultTooling.e2eTestRunner),
    editorExtensions: get('editorExtensions', defaultTooling.editorExtensions),
    formatter: get('formatter', defaultTooling.formatter),
    fundingUrl: get('fundingUrl', ''),
    gitHubActions: get('gitHubActions', defaultTooling.gitHubActions),
    gitHubFunding: get('gitHubFunding', defaultTooling.gitHubFunding),
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
    pluginShortName: extractWords(pluginId).join(''),
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
      defaultValue: () => d.gitHubFunding ?? defaultTooling.gitHubFunding,
      key: 'gitHubFunding',
      prompt: (saved): Promise<string> => promptGitHubFunding(saved),
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
          placeholder: saved || 'my-awesome-plugin',
          validate: validatePluginId
        })
    },
    {
      defaultValue: (answers) => d.pluginName ?? makePluginName(answers.get('pluginId') ?? 'my-awesome-plugin'),
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
      defaultValue: (answers) => d.fundingUrl ?? `https://buymeacoffee.com/${answers.get('authorGitHubName') ?? 'johndoe'}`,
      key: 'fundingUrl',
      prompt: (saved): Promise<string> =>
        text({
          defaultValue: saved,
          message: 'Funding URL (leave empty if not needed)',
          placeholder: saved
        })
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
    ...getDefaultTooling('enhanced'),
    authorGitHubName: 'johndoe',
    authorName: 'John Doe',
    bundler: 'esbuild',
    currentYear: new Date().getFullYear(),
    fundingUrl: 'https://buymeacoffee.com/johndoe',
    obsidianConfigFolder: '',
    packageManager: 'npm',
    platformSupport: 'desktop-only',
    pluginDescription: 'Does something awesome.',
    pluginId,
    pluginName: makePluginName(pluginId),
    pluginShortName: extractWords(pluginId).join(''),
    preset: 'enhanced',
    uiFramework: 'none'
  };
}

function getDefaultTooling(preset: string): DefaultTooling {
  return {
    apiSubset: 'official',
    commitLinting: 'conventional-commits',
    e2eTestRunner: 'none',
    editorExtensions: preset === 'demo' ? 'codemirror' : 'none',
    formatter: 'dprint',
    gitHubActions: 'ci-and-release',
    gitHubFunding: 'funding-yml',
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
    placeholder: value ?? 'My Awesome Plugin',
    validate: validateNotEmpty
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

function validateNotEmpty(value: string | undefined): string | undefined {
  if (!value) {
    return 'Should not be empty';
  }
  return undefined;
}

function validatePluginDescription(input: string | undefined): string | undefined {
  if (!input) {
    return 'Should not be empty';
  }
  if (!input.endsWith('.')) {
    return 'Should end with a dot';
  }
  return undefined;
}

function validatePluginId(input: string | undefined): string | undefined {
  if (!input) {
    return 'Should not be empty';
  }
  if (!/^[a-z0-9-]+$/.test(input)) {
    return 'Should contain only lowercase English letters, digits and hyphens';
  }
  if (!/^[a-z]/.test(input)) {
    return 'Should start with a letter';
  }
  if (!/[a-z0-9]$/.test(input)) {
    return 'Should end with a letter or digit';
  }
  if (input.startsWith('obsidian-')) {
    return 'Should not start with "obsidian-"';
  }
  return undefined;
}
