import {
  cancel,
  group,
  text
} from '@clack/prompts';
import { basename } from 'node:path';

import type { Answers } from './Answers.ts';

import { buildDerivedBooleans } from './Answers.ts';
import { promptApiSubset } from './features/ApiSubset/index.ts';
import { promptBuildSystem } from './features/BuildSystem/index.ts';
import { promptCssMode } from './features/CssMode/index.ts';
import { promptE2eTestRunner } from './features/E2eTestRunner/index.ts';
import { promptEditorExtensions } from './features/EditorExtensions/index.ts';
import { promptFormatter } from './features/Formatter/index.ts';
import { promptFramework } from './features/Framework/index.ts';
import { promptLinter } from './features/Linter/index.ts';
import { promptMarkdownLinter } from './features/MarkdownLinter/index.ts';
import { promptPackageManager } from './features/PackageManager/index.ts';
import { promptPlatformSupport } from './features/PlatformSupport/index.ts';
import { promptPreset } from './features/Preset/index.ts';
import { promptSpellChecker } from './features/SpellChecker/index.ts';
import { promptTestRunner } from './features/TestRunner/index.ts';
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
  cssMode: string;
  e2eTestRunner: string;
  editorExtensions: string;
  formatter: string;
  linter: string;
  markdownLinter: string;
  spellChecker: string;
  testRunner: string;
  wasmSupport: string;
}

export async function promptAnswers(defaults?: Partial<Answers>): Promise<Answers> {
  const preset = await promptPreset(defaults?.preset);

  // Build system (not for Demo)
  const buildSystem = preset === 'demo'
    ? 'esbuild'
    : await promptBuildSystem(defaults?.buildSystem);

  // UI framework (not for Demo)
  const framework = preset === 'demo'
    ? 'none'
    : await promptFramework(defaults?.framework);

  const tooling = await promptTooling(preset, defaults);

  const packageManager = await promptPackageManager(defaults?.packageManager);
  const platformSupport = await promptPlatformSupport(defaults?.platformSupport);

  // Plugin metadata
  const metadata = await promptMetadata(defaults);

  const features = {
    ...tooling,
    buildSystem,
    framework,
    packageManager,
    platformSupport,
    preset
  };

  return {
    ...features,
    ...buildDerivedBooleans(features),
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
          placeholder: 'https://buymeacoffee.com/...'
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
  let linter = 'eslint';
  let formatter = 'prettier';
  let spellChecker = 'cspell';
  let markdownLinter = 'markdownlint';
  let editorExtensions = preset === 'demo' ? 'codemirror' : 'none';
  let cssMode = preset === 'demo' ? 'scss' : 'none';
  let wasmSupport = 'none';
  let testRunner = 'vitest';
  let e2eTestRunner = 'none';
  let apiSubset = 'official';

  if (preset !== 'demo') {
    linter = await promptLinter(defaults?.linter);
    formatter = await promptFormatter(defaults?.formatter);
    spellChecker = await promptSpellChecker(defaults?.spellChecker);
    markdownLinter = await promptMarkdownLinter(defaults?.markdownLinter);
    testRunner = await promptTestRunner(defaults?.testRunner);
    e2eTestRunner = await promptE2eTestRunner(defaults?.e2eTestRunner);
    editorExtensions = await promptEditorExtensions(defaults?.editorExtensions);
    cssMode = await promptCssMode(defaults?.cssMode);
    wasmSupport = await promptWasmSupport(defaults?.wasmSupport);

    if (preset === 'enhanced') {
      apiSubset = await promptApiSubset(defaults?.apiSubset);
    }
  }

  return {
    apiSubset,
    cssMode,
    e2eTestRunner,
    editorExtensions,
    formatter,
    linter,
    markdownLinter,
    spellChecker,
    testRunner,
    wasmSupport
  };
}
