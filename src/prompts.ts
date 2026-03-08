import {
  cancel,
  group,
  select,
  text
} from '@clack/prompts';
import { basename } from 'node:path';

import type { Answers } from './Answers.ts';

import { assertNotCancelled } from './clack-utils.ts';
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

interface PluginMetadata {
  authorGitHubName: string;
  authorName: string;
  fundingUrl: string;
  pluginDescription: string;
  pluginId: string;
  pluginName: string;
}

interface ToolingOptions {
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

export function getDefaultAnswers(defaults?: Partial<Answers>): Answers {
  const pluginId = defaults?.pluginId ?? (basename(process.cwd()).replace(/^obsidian-/, '') || 'my-awesome-plugin');
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
  const preset = await promptPreset(defaults?.preset);

  const toolingMode = preset === 'demo'
    ? 'defaults'
    : await promptToolingMode();

  let bundler: string;
  let uiFramework: string;
  let tooling: ToolingOptions;
  let packageManager: string;
  let platformSupport: string;

  if (toolingMode === 'customize') {
    bundler = await promptBundler(defaults?.bundler);
    uiFramework = await promptUiFramework(defaults?.uiFramework);
    tooling = await promptTooling(preset, defaults);
    packageManager = await promptPackageManager(defaults?.packageManager);
    platformSupport = await promptPlatformSupport(defaults?.platformSupport);
  } else {
    const defaultAnswers = getDefaultAnswers(defaults);
    bundler = preset === 'demo' ? 'esbuild' : defaultAnswers.bundler;
    uiFramework = preset === 'demo' ? 'none' : defaultAnswers.uiFramework;
    tooling = getDefaultTooling(preset);
    packageManager = defaultAnswers.packageManager;
    platformSupport = defaultAnswers.platformSupport;
  }

  const metadata = await promptMetadata(defaults);

  const features = {
    ...tooling,
    bundler,
    packageManager,
    platformSupport,
    preset,
    uiFramework
  };

  return {
    ...features,
    authorGitHubName: metadata.authorGitHubName,
    authorName: metadata.authorName,
    currentYear: new Date().getFullYear(),
    fundingUrl: metadata.fundingUrl,
    pluginDescription: metadata.pluginDescription,
    pluginId: metadata.pluginId,
    pluginName: metadata.pluginName,
    pluginShortName: extractWords(metadata.pluginId).join('')
  };
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
    fundingUrl: '',
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

function getDefaultTooling(preset: string): ToolingOptions {
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

async function promptMetadata(defaults?: Partial<Answers>): Promise<PluginMetadata> {
  const metadata = await group(
    {
      authorGitHubName: () =>
        text({
          defaultValue: defaults?.authorGitHubName ?? 'johndoe',
          message: 'Your GitHub username',
          placeholder: defaults?.authorGitHubName ?? 'johndoe',
          validate(value): string | undefined {
            if (!value) {
              return 'Should not be empty';
            }
            return undefined;
          }
        }),
      authorName: () =>
        text({
          defaultValue: defaults?.authorName ?? 'John Doe',
          message: 'Your full name',
          placeholder: defaults?.authorName ?? 'John Doe',
          validate(value): string | undefined {
            if (!value) {
              return 'Should not be empty';
            }
            return undefined;
          }
        }),
      fundingUrl: () =>
        text({
          defaultValue: defaults?.fundingUrl ?? '',
          message: 'Funding URL (leave empty if not needed)',
          placeholder: 'https://buymeacoffee.com/johndoe'
        }),
      pluginDescription: () =>
        text({
          defaultValue: defaults?.pluginDescription ?? 'Does something awesome.',
          message: 'Plugin description',
          placeholder: defaults?.pluginDescription ?? 'Does something awesome.',
          validate(value): string | undefined {
            if (!value) {
              return 'Should not be empty';
            }
            if (!value.endsWith('.')) {
              return 'Should end with a dot';
            }
            return undefined;
          }
        }),
      pluginId: () =>
        text({
          defaultValue: defaults?.pluginId ?? basename(process.cwd()).replace(/^obsidian-/, ''),
          message: 'Plugin id (lowercase, hyphens allowed)',
          placeholder: defaults?.pluginId ?? 'my-awesome-plugin',
          validate(value): string | undefined {
            if (!value) {
              return 'Should not be empty';
            }
            if (!/^[a-z0-9-]+$/.test(value)) {
              return 'Should contain only lowercase English letters, digits and hyphens';
            }
            if (!/^[a-z]/.test(value)) {
              return 'Should start with a letter';
            }
            if (!/[a-z0-9]$/.test(value)) {
              return 'Should end with a letter or digit';
            }
            if (value.startsWith('obsidian-')) {
              return 'Should not start with "obsidian-"';
            }
            return undefined;
          }
        }),
      pluginName: ({ results }) =>
        text({
          defaultValue: defaults?.pluginName ?? makePluginName(results.pluginId ?? ''),
          message: 'Plugin display name',
          placeholder: defaults?.pluginName ?? makePluginName(results.pluginId ?? ''),
          validate(value): string | undefined {
            if (!value) {
              return 'Should not be empty';
            }
            return undefined;
          }
        })
    },
    {
      onCancel() {
        cancel('Operation cancelled.');
        process.exit(0);
      }
    }
  );

  return metadata as PluginMetadata;
}

async function promptTooling(preset: string, defaults?: Partial<Answers>): Promise<ToolingOptions> {
  const tooling = getDefaultTooling(preset);

  if (preset === 'demo') {
    return tooling;
  }

  tooling.linter = await promptLinter(defaults?.linter);
  tooling.formatter = await promptFormatter(defaults?.formatter);
  tooling.spellChecker = await promptSpellChecker(defaults?.spellChecker);
  tooling.markdownLinter = await promptMarkdownLinter(defaults?.markdownLinter);
  tooling.testRunner = await promptTestRunner(defaults?.testRunner);
  tooling.e2eTestRunner = await promptE2eTestRunner(defaults?.e2eTestRunner);
  tooling.editorExtensions = await promptEditorExtensions(defaults?.editorExtensions);
  tooling.styling = await promptStyling(defaults?.styling);
  tooling.wasmSupport = await promptWasmSupport(defaults?.wasmSupport);
  tooling.commitLinting = await promptCommitLinting(defaults?.commitLinting);
  tooling.hotReload = await promptHotReload(defaults?.hotReload);
  tooling.internationalization = await promptInternationalization(defaults?.internationalization);
  tooling.gitHubActions = await promptGitHubActions(defaults?.gitHubActions);
  tooling.gitHubIssueTemplates = await promptGitHubIssueTemplates(defaults?.gitHubIssueTemplates);
  tooling.gitHubFunding = await promptGitHubFunding(defaults?.gitHubFunding);

  if (preset === 'enhanced') {
    tooling.apiSubset = await promptApiSubset(defaults?.apiSubset);
  }

  return tooling;
}

async function promptToolingMode(): Promise<string> {
  const result = await select({
    initialValue: 'defaults',
    message: 'Tooling',
    options: [
      { hint: 'ESLint, dprint, SCSS, Vitest, and more', label: 'Use recommended defaults', value: 'defaults' },
      { hint: 'Choose each tool individually', label: 'Customize', value: 'customize' }
    ]
  });
  assertNotCancelled(result);
  return result;
}
