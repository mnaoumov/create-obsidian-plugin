import { log } from '@clack/prompts';
import ejs from 'ejs';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import {
  dirname,
  join
} from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  Answers,
  GeneratorConfig
} from './Answers.ts';
import type { FeatureOption } from './FeatureOption.ts';

import { CONFIG_FILE_NAME } from './Answers.ts';
import { resolveFeature } from './FeatureOption.ts';
import { API_SUBSET_OPTIONS } from './features/ApiSubset/index.ts';
import { BUILD_SYSTEM_OPTIONS } from './features/BuildSystem/index.ts';
import { CSS_MODE_OPTIONS } from './features/CssMode/index.ts';
import { E2E_TEST_RUNNER_OPTIONS } from './features/E2eTestRunner/index.ts';
import { EDITOR_EXTENSIONS_OPTIONS } from './features/EditorExtensions/index.ts';
import { FORMATTER_OPTIONS } from './features/Formatter/index.ts';
import { GITHUB_FUNDING_OPTIONS } from './features/GitHubFunding/index.ts';
import { GITHUB_ISSUE_TEMPLATES_OPTIONS } from './features/GitHubIssueTemplates/index.ts';
import { LINTER_OPTIONS } from './features/Linter/index.ts';
import { MARKDOWN_LINTER_OPTIONS } from './features/MarkdownLinter/index.ts';
import { PRESET_OPTIONS } from './features/Preset/index.ts';
import { SPELL_CHECKER_OPTIONS } from './features/SpellChecker/index.ts';
import { TEST_RUNNER_OPTIONS } from './features/TestRunner/index.ts';
import { UI_FRAMEWORK_OPTIONS } from './features/UiFramework/index.ts';
import { WASM_SUPPORT_OPTIONS } from './features/WasmSupport/index.ts';
import { TemplateBuilder } from './TemplateBuilder.ts';

const JSON_INDENT_SPACES = 2;

const BASE_TEMPLATE_FILES = [
  '.editorconfig',
  '.env',
  '.gitattributes',
  '.gitignore',
  '.npmrc',
  'LICENSE',
  'README.md',
  'manifest.json',
  'package.json',
  'src/Plugin.ts',
  'src/main.ts',
  'tsconfig.json',
  'versions.json'
];

interface FeatureRegistry {
  answerKey: keyof Answers;
  options: readonly FeatureOption[];
}

const FEATURE_REGISTRIES: FeatureRegistry[] = [
  { answerKey: 'preset', options: PRESET_OPTIONS },
  { answerKey: 'buildSystem', options: BUILD_SYSTEM_OPTIONS },
  { answerKey: 'uiFramework', options: UI_FRAMEWORK_OPTIONS },
  { answerKey: 'linter', options: LINTER_OPTIONS },
  { answerKey: 'formatter', options: FORMATTER_OPTIONS },
  { answerKey: 'spellChecker', options: SPELL_CHECKER_OPTIONS },
  { answerKey: 'markdownLinter', options: MARKDOWN_LINTER_OPTIONS },
  { answerKey: 'testRunner', options: TEST_RUNNER_OPTIONS },
  { answerKey: 'e2eTestRunner', options: E2E_TEST_RUNNER_OPTIONS },
  { answerKey: 'editorExtensions', options: EDITOR_EXTENSIONS_OPTIONS },
  { answerKey: 'cssMode', options: CSS_MODE_OPTIONS },
  { answerKey: 'gitHubIssueTemplates', options: GITHUB_ISSUE_TEMPLATES_OPTIONS },
  { answerKey: 'gitHubFunding', options: GITHUB_FUNDING_OPTIONS },
  { answerKey: 'wasmSupport', options: WASM_SUPPORT_OPTIONS },
  { answerKey: 'apiSubset', options: API_SUBSET_OPTIONS }
];

const DEMO_OVERRIDES: { answerKey: keyof Answers; demoValue: string; options: readonly FeatureOption[] }[] = [
  { answerKey: 'uiFramework', demoValue: 'react', options: UI_FRAMEWORK_OPTIONS },
  { answerKey: 'uiFramework', demoValue: 'svelte', options: UI_FRAMEWORK_OPTIONS },
  { answerKey: 'uiFramework', demoValue: 'vue', options: UI_FRAMEWORK_OPTIONS },
  { answerKey: 'editorExtensions', demoValue: 'codemirror', options: EDITOR_EXTENSIONS_OPTIONS },
  { answerKey: 'linter', demoValue: 'eslint', options: LINTER_OPTIONS },
  { answerKey: 'markdownLinter', demoValue: 'markdownlint', options: MARKDOWN_LINTER_OPTIONS },
  { answerKey: 'spellChecker', demoValue: 'cspell', options: SPELL_CHECKER_OPTIONS },
  { answerKey: 'cssMode', demoValue: 'scss', options: CSS_MODE_OPTIONS }
];

export function buildTemplate(answers: Answers): TemplateBuilder {
  const builder = new TemplateBuilder();

  builder
    .addFiles(BASE_TEMPLATE_FILES)
    .addPackage('@types/node', '25.0.3')
    .addPackage('jiti')
    .addPackage('obsidian')
    .addPackage('tslib')
    .addPackage('typescript')
    .addPartial('common');

  if (answers.fundingUrl) {
    builder.addPartial('has-funding');
  }

  for (const registry of FEATURE_REGISTRIES) {
    const value = String(answers[registry.answerKey]);
    const option = resolveFeature(registry.options, value);
    option.configure(builder, answers);
    builder.addPartial(value);
  }

  if (answers.preset === 'demo') {
    for (const override of DEMO_OVERRIDES) {
      if (String(answers[override.answerKey]) !== override.demoValue) {
        const option = resolveFeature(override.options, override.demoValue);
        option.configure(builder, answers);
        builder.addPartial(override.demoValue);
      }
    }
  }

  return builder;
}

export function copyTemplates(answers: Answers, targetDir: string, currentVersion: string, existingConfig: GeneratorConfig | null): GeneratorConfig {
  const templatesDir = join(getScriptDir(), '..', 'templates', 'default');
  const newConfig: GeneratorConfig = {
    fileHashes: {},
    generatorVersion: currentVersion
  };

  const builder = buildTemplate(answers);
  const templateFiles = builder.templateFiles;
  const partials = builder.partials;

  let currentTemplatePath = '';
  let renderRoot = '';

  const templateContext: Record<string, unknown> = {
    ...answers,
    _dependencies: builder.dependencies,
    _scripts: builder.scripts,
    render(section?: string): string {
      const basePath = (renderRoot || currentTemplatePath).replace(/\.ejs$/, '');
      const previousTemplatePath = currentTemplatePath;
      const previousRenderRoot = renderRoot;
      let result = '';
      for (const partial of partials) {
        const partialPath = section
          ? `${basePath}@${section}_${partial}.ejs`
          : `${basePath}_${partial}.ejs`;
        const fullPath = join(templatesDir, partialPath);
        if (!existsSync(fullPath)) {
          continue;
        }
        currentTemplatePath = partialPath;
        if (!renderRoot) {
          renderRoot = partialPath;
        }
        // eslint-disable-next-line import-x/no-named-as-default-member -- This is the standard EJS API.
        result += ejs.render(readFileSync(fullPath, 'utf-8'), templateContext);
      }
      currentTemplatePath = previousTemplatePath;
      renderRoot = previousRenderRoot;
      return result;
    }
  };

  const skipped: string[] = [];
  const updated: string[] = [];
  const created: string[] = [];

  for (const registeredPath of templateFiles) {
    if (isPartialFile(registeredPath)) {
      continue;
    }

    const destinationPath = getDestinationPath(registeredPath, answers);
    const fullDestinationPath = join(targetDir, destinationPath);
    const ejsPath = join(templatesDir, `${registeredPath}.ejs`);

    let rendered: string;
    if (existsSync(ejsPath)) {
      currentTemplatePath = `${registeredPath}.ejs`;
      try {
        // eslint-disable-next-line import-x/no-named-as-default-member -- This is the standard EJS API.
        rendered = ejs.render(readFileSync(ejsPath, 'utf-8'), templateContext);
      } catch {
        rendered = readFileSync(ejsPath, 'utf-8');
      }
    } else {
      currentTemplatePath = `${registeredPath}.ejs`;
      rendered = (templateContext['render'] as (section?: string) => string)();
    }

    const newHash = sha256(rendered);
    newConfig.fileHashes[destinationPath] = newHash;

    if (existingConfig && existsSync(fullDestinationPath)) {
      const currentContent = readFileSync(fullDestinationPath, 'utf-8');
      const currentHash = sha256(currentContent);
      const originalHash = existingConfig.fileHashes[destinationPath];

      if (currentHash === newHash) {
        continue;
      }

      if (originalHash && currentHash !== originalHash) {
        skipped.push(destinationPath);
        newConfig.fileHashes[destinationPath] = currentHash;
        continue;
      }

      updated.push(destinationPath);
    } else {
      created.push(destinationPath);
    }

    const destDir = dirname(fullDestinationPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    writeFileSync(fullDestinationPath, rendered);
  }

  const configPath = join(targetDir, CONFIG_FILE_NAME);
  writeFileSync(configPath, `${JSON.stringify(newConfig, null, JSON_INDENT_SPACES)}\n`);

  if (existingConfig) {
    logUpdateSummary(updated, created, skipped);
  }

  return newConfig;
}

export function getScriptDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

export function loadConfig(dir: string): GeneratorConfig | null {
  const configPath = join(dir, CONFIG_FILE_NAME);
  if (!existsSync(configPath)) {
    return null;
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8')) as unknown as GeneratorConfig;
  migrateConfig(config);
  return config;
}

function getDestinationPath(templatePath: string, answers: Answers): string {
  return templatePath.replace(/%= (?<AnswerKey>.+?) %/g, (_match: string, ...args: unknown[]) => String(answers[String(args[0]) as keyof Answers]));
}

function isPartialFile(templatePath: string): boolean {
  const fileName = templatePath.split('/').pop() ?? '';
  return fileName.includes('_');
}

function logUpdateSummary(updated: string[], created: string[], skipped: string[]): void {
  if (updated.length > 0) {
    log.success(`Updated ${String(updated.length)} file(s):`);
    for (const f of updated) {
      log.info(`  ${f}`);
    }
  }

  if (created.length > 0) {
    log.success(`Created ${String(created.length)} new file(s):`);
    for (const f of created) {
      log.info(`  ${f}`);
    }
  }

  if (skipped.length > 0) {
    log.warn(`Skipped ${String(skipped.length)} file(s) with local modifications:`);
    for (const f of skipped) {
      log.info(`  ${f}`);
    }
  }

  if (updated.length === 0 && created.length === 0) {
    log.info('Everything is already up to date.');
  }
}

function migrateConfig(config: GeneratorConfig): void {
  if (!config.answers) {
    return;
  }
  const raw = config.answers as unknown as Record<string, unknown>;
  if (raw['framework'] && !raw['uiFramework']) {
    raw['uiFramework'] = raw['framework'];
    delete raw['framework'];
  }
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
