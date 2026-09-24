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
  extname,
  join
} from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  Answers,
  GeneratorConfig
} from './answers.ts';
import type { FeatureOption } from './feature-option.ts';
import type { Overlay } from './overlay.ts';

import {
  CONFIG_FILE_NAME,
  getPluginShortName
} from './answers.ts';
import { resolveFeature } from './feature-option.ts';
import { API_SUBSET_OPTIONS } from './features/api-subset/index.ts';
import { addBranchGate } from './features/branch-gate.ts';
import { BUNDLER_OPTIONS } from './features/bundler/index.ts';
import { COMMIT_LINTING_OPTIONS } from './features/commit-linting/index.ts';
import { COVERAGE_BADGE_OPTIONS } from './features/coverage-badge/index.ts';
import { E2E_TEST_RUNNER_OPTIONS } from './features/e2e-test-runner/index.ts';
import { EDITOR_EXTENSIONS_OPTIONS } from './features/editor-extensions/index.ts';
import { FORMATTER_OPTIONS } from './features/formatter/index.ts';
import {
  FUNDING_PLATFORM_OPTIONS,
  resolveFunding,
  validateFundingUsername
} from './features/funding-platform/index.ts';
import { addStagedFilesHook } from './features/git-hooks.ts';
import { GITHUB_ACTIONS_OPTIONS } from './features/git-hub-actions/index.ts';
import { GITHUB_ISSUE_TEMPLATES_OPTIONS } from './features/git-hub-issue-templates/index.ts';
import { HOT_RELOAD_OPTIONS } from './features/hot-reload/index.ts';
import { INTERNATIONALIZATION_OPTIONS } from './features/internationalization/index.ts';
import { LINTER_OPTIONS } from './features/linter/index.ts';
import { MARKDOWN_LINTER_OPTIONS } from './features/markdown-linter/index.ts';
import { PACKAGE_MANAGER_OPTIONS } from './features/package-manager/index.ts';
import { PLATFORM_SUPPORT_OPTIONS } from './features/platform-support/index.ts';
import { PRESET_OPTIONS } from './features/preset/index.ts';
import { SPELL_CHECKER_OPTIONS } from './features/spell-checker/index.ts';
import { STYLING_OPTIONS } from './features/styling/index.ts';
import { TEST_RUNNER_OPTIONS } from './features/test-runner/index.ts';
import { UI_FRAMEWORK_OPTIONS } from './features/ui-framework/index.ts';
import { WASM_SUPPORT_OPTIONS } from './features/wasm-support/index.ts';
import {
  PARTIAL_NAME_PATTERN,
  TemplateBuilder
} from './template-builder.ts';
import {
  buildOverrides,
  buildPinnedVersionsJson,
  buildResolutions,
  FALLBACK_MIN_APP_VERSION,
  PINNED_VERSIONS
} from './versions.ts';

/**
 * Extensions whose template is copied verbatim rather than rendered -- the second kind of template.
 *
 * `templates/default` is otherwise all EJS text, and `copyTemplates` read every file as UTF-8 and put it
 * through EJS. That is exactly right for text and destroys a binary: the `wasm` answer needs a real
 * WebAssembly module, and a `.wasm` decoded as UTF-8 and written back is no longer a module. So an asset
 * is read as bytes, hashed as bytes and written as bytes, with no EJS anywhere near it.
 *
 * A SET rather than an `instanceof Buffer` sniff, because the two kinds have to be distinguishable by
 * looking at the tree: a declared list is what lets the plan tier know a registered path with no `.ejs`
 * is satisfied by an asset rather than unresolvable, and what lets the render tier check the emitted
 * bytes are a valid module instead of parsing them as text.
 */
export const ASSET_EXTENSIONS: ReadonlySet<string> = new Set(['.wasm']);

const JSON_INDENT_SPACES = 2;

// Only reached when generation runs without a resolution pass -- rendering tests, and `latest` is what the
// Generator emitted for everything before the pin table existed.
const UNRESOLVED_VERSION = 'latest';

const BASE_TEMPLATE_FILES = [
  // Never empty: `tslib` and `typescript` below are false positives on every answer set.
  '.depcheckrc.json',
  '.editorconfig',
  '.env',
  '.gitattributes',
  '.gitignore',
  '.npmrc',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md',
  'manifest.json',
  'package.json',
  'pinned-versions.json',
  // Emitted for every project, not only the pnpm answer, for the same reason `resolutions` is: which
  // Tool installs a checkout is not a property of the checkout. Without it `pnpm install` FAILS with
  // ERR_PNPM_IGNORED_BUILDS -- pnpm blocks dependency install scripts by default and, since 10, treats
  // That as an error rather than a warning.
  'pnpm-workspace.yaml',
  'src/main.ts',
  'src/plugin.ts',
  'tsconfig.json',
  'versions.json'
];

interface FeatureRegistry {
  answerKey: keyof Answers;
  options: readonly FeatureOption[];
}

interface RenderOptions {
  indentLevel?: number;
  section?: string;
}

const FEATURE_REGISTRIES: FeatureRegistry[] = [
  { answerKey: 'preset', options: PRESET_OPTIONS },
  { answerKey: 'bundler', options: BUNDLER_OPTIONS },
  { answerKey: 'uiFramework', options: UI_FRAMEWORK_OPTIONS },
  { answerKey: 'linter', options: LINTER_OPTIONS },
  { answerKey: 'formatter', options: FORMATTER_OPTIONS },
  { answerKey: 'spellChecker', options: SPELL_CHECKER_OPTIONS },
  { answerKey: 'markdownLinter', options: MARKDOWN_LINTER_OPTIONS },
  { answerKey: 'testRunner', options: TEST_RUNNER_OPTIONS },
  { answerKey: 'e2eTestRunner', options: E2E_TEST_RUNNER_OPTIONS },
  { answerKey: 'editorExtensions', options: EDITOR_EXTENSIONS_OPTIONS },
  { answerKey: 'styling', options: STYLING_OPTIONS },
  { answerKey: 'commitLinting', options: COMMIT_LINTING_OPTIONS },
  { answerKey: 'hotReload', options: HOT_RELOAD_OPTIONS },
  { answerKey: 'internationalization', options: INTERNATIONALIZATION_OPTIONS },
  { answerKey: 'gitHubActions', options: GITHUB_ACTIONS_OPTIONS },
  { answerKey: 'gitHubIssueTemplates', options: GITHUB_ISSUE_TEMPLATES_OPTIONS },
  { answerKey: 'fundingPlatform', options: FUNDING_PLATFORM_OPTIONS },
  { answerKey: 'coverageBadge', options: COVERAGE_BADGE_OPTIONS },
  { answerKey: 'wasmSupport', options: WASM_SUPPORT_OPTIONS },
  { answerKey: 'apiSubset', options: API_SUBSET_OPTIONS },
  // Both of these were missing, and a question absent from this list is a question the user is asked
  // And whose answer is then discarded. `platformSupport` was the live one: `manifest.json.ejs` calls
  // `render('platform')` and both partials sit on disk, but with nothing contributing `desktop-only` or
  // `desktop-and-mobile` the section rendered as nothing, so EVERY generated manifest shipped without
  // `isDesktopOnly` -- a required field. `packageManager` contributes no partial today and so changes
  // No output; it is registered anyway, because "every question is here" is the invariant that keeps
  // The next one from going the same way, and because a `X_npm.ejs` added later should just work.
  { answerKey: 'platformSupport', options: PLATFORM_SUPPORT_OPTIONS },
  { answerKey: 'packageManager', options: PACKAGE_MANAGER_OPTIONS }
];

interface DemoOverride {
  answerKey: keyof Answers;
  demoValue: string;
  options: readonly FeatureOption[];
}

const DEMO_OVERRIDES: DemoOverride[] = [
  { answerKey: 'uiFramework', demoValue: 'react', options: UI_FRAMEWORK_OPTIONS },
  { answerKey: 'uiFramework', demoValue: 'svelte', options: UI_FRAMEWORK_OPTIONS },
  { answerKey: 'uiFramework', demoValue: 'vue', options: UI_FRAMEWORK_OPTIONS },
  { answerKey: 'editorExtensions', demoValue: 'codemirror', options: EDITOR_EXTENSIONS_OPTIONS },
  { answerKey: 'linter', demoValue: 'eslint', options: LINTER_OPTIONS },
  { answerKey: 'markdownLinter', demoValue: 'markdownlint', options: MARKDOWN_LINTER_OPTIONS },
  { answerKey: 'spellChecker', demoValue: 'cspell', options: SPELL_CHECKER_OPTIONS },
  { answerKey: 'styling', demoValue: 'scss', options: STYLING_OPTIONS }
];

export function buildTemplate(answers: Answers, overlay: null | Overlay = null): TemplateBuilder {
  const builder = new TemplateBuilder();

  builder
    .addFiles(BASE_TEMPLATE_FILES)
    .addPackage('@types/node')
    .addPackage('jiti')
    .addPackage('obsidian')
    .addPackage('tslib')
    .addDepcheckIgnore('tslib', 'never imported by name: `importHelpers: true` in `tsconfig.json` makes the compiled output import it.')
    .addPackage('typescript')
    .addDepcheckIgnore('typescript', 'the compiler `tsconfig.json` configures, reached by `tsc`, by the TypeScript step of the bundler and by the editor rather than by an import.')
    // The plugin's own name is a proper noun in its own UI, so `obsidianmd/ui/sentence-case` must not
    // Ask for `My awesome plugin`. Registered here rather than by a feature because every plugin has
    // One, whatever else it picks.
    .addSentenceCaseBrand(answers.pluginName)
    .addPartial('common');

  // The funding badge comes first on the line, then release and downloads, then the coverage badge its
  // Own answer adds from the registry loop below -- the order every real plugin's README has.
  const funding = resolveFunding(answers);
  if (funding) {
    builder
      .addFiles(['.github/FUNDING.yml'])
      .addBadge(funding.getBadge(answers))
      .addPartial('has-funding');
  }

  const repoUrl = `https://github.com/${answers.authorGitHubName}/obsidian-${answers.pluginId}`;
  builder
    .addBadge(`[![GitHub release](https://img.shields.io/github/v/release/${answers.authorGitHubName}/obsidian-${answers.pluginId})](${repoUrl}/releases)`)
    .addBadge(`[![GitHub downloads](https://img.shields.io/github/downloads/${answers.authorGitHubName}/obsidian-${answers.pluginId}/total)](${repoUrl}/releases)`);

  if (answers.obsidianConfigFolder) {
    builder.addPartial('has-vault-true');
  } else {
    builder.addPartial('has-vault-false');
  }

  for (const registry of FEATURE_REGISTRIES) {
    const value = String(answers[registry.answerKey]);
    const option = resolveFeature(registry.options, value);
    option.configure(builder, answers);
    builder.addPartial(option.partialName);
  }

  if (answers.preset === 'demo') {
    for (const override of DEMO_OVERRIDES) {
      const chosenValue = String(answers[override.answerKey]);
      if (chosenValue === override.demoValue) {
        continue;
      }

      const option = resolveFeature(override.options, override.demoValue);
      if (conflictsOverJsxRuntime(resolveFeature(override.options, chosenValue), option)) {
        continue;
      }

      option.configure(builder, answers);
      builder.addPartial(option.partialName);
    }
  }

  // After every answer and demo override, so an overlay's partials render after the built-in ones at each
  // Seam and its badges follow the built-in badges on the README's badge line.
  if (overlay) {
    applyOverlay(builder, overlay);
  }

  // Last, because the demo overrides can register staged-files commands too. The pre-commit hook exists
  // Exactly when something registered a command for it -- whatever the commit-linting answer was.
  if (builder.lintStagedPatterns.length > 0) {
    addStagedFilesHook(builder);
  }

  // Last for the same reason: whether the gate can run depends on scripts four other answers register.
  addBranchGate(builder);

  return builder;
}

export function copyTemplates(
  answers: Answers,
  targetDir: string,
  currentVersion: string,
  existingConfig: GeneratorConfig | null,
  resolvedVersions: ReadonlyMap<string, string> = new Map(),
  minAppVersion: string = FALLBACK_MIN_APP_VERSION,
  overlay: null | Overlay = null
): GeneratorConfig {
  const templatesDir = join(getScriptDir(), '..', 'templates', 'default');

  /**
   * The one place a template path becomes a file: the overlay first, then `templates/default`. Every read
   * goes through it -- whole files, partials at any depth, and assets -- so an overlay overrides a partial
   * file exactly as it overrides a whole one.
   */
  function findTemplate(relativePath: string): null | string {
    if (overlay) {
      const overlayPath = join(overlay.dir, relativePath);
      if (existsSync(overlayPath)) {
        return overlayPath;
      }
    }
    const builtInPath = join(templatesDir, relativePath);
    return existsSync(builtInPath) ? builtInPath : null;
  }
  const newConfig: GeneratorConfig = {
    fileHashes: {},
    generatorVersion: currentVersion
  };

  const builder = buildTemplate(answers, overlay);
  const templateFiles = builder.templateFiles;
  const partials = builder.partials;
  const dependencies = builder.dependencies;

  let currentTemplatePath = '';
  let renderRoot = '';

  const templateContext: Record<string, unknown> = {
    ...answers,
    ...getFundingTemplateContext(answers),
    _badges: builder.badges,
    _depcheckIgnores: builder.depcheckIgnores,
    _dependencies: dependencies.map((dependency) => ({
      packageName: dependency.packageName,
      version: dependency.version ?? resolvedVersions.get(dependency.packageName) ?? PINNED_VERSIONS[dependency.packageName]?.version ?? UNRESOLVED_VERSION
    })),
    _lintStagedPatterns: builder.lintStagedPatterns,
    _minAppVersion: minAppVersion,
    _overrides: Object.entries(buildOverrides(dependencies)).map(([packageName, spec]) => ({ packageName, spec })),
    _pinnedVersionsJson: buildPinnedVersionsJson(dependencies),
    _resolutions: Object.entries(buildResolutions(dependencies)).map(([packageName, spec]) => ({ packageName, spec })),
    _scripts: builder.scripts,
    _sentenceCaseBrands: builder.sentenceCaseBrands,
    pluginShortName: getPluginShortName(answers.pluginId),
    render(options?: RenderOptions | string): string {
      const { indentLevel, section } = typeof options === 'string'
        ? { indentLevel: 0, section: options }
        : { indentLevel: 0, section: undefined, ...options };
      const basePath = (renderRoot || currentTemplatePath).replace(/\.ejs$/, '');
      const previousTemplatePath = currentTemplatePath;
      const previousRenderRoot = renderRoot;
      let result = '';
      for (const partial of partials) {
        const partialPath = section
          ? `${basePath}@${section}_${partial}.ejs`
          : `${basePath}_${partial}.ejs`;
        const fullPath = findTemplate(partialPath);
        if (fullPath === null) {
          continue;
        }
        currentTemplatePath = partialPath;
        if (!renderRoot) {
          renderRoot = partialPath;
        }
        // eslint-disable-next-line import-x/no-named-as-default-member -- This is the standard EJS API.
        let rendered = ejs.render(readFileSync(fullPath, 'utf-8'), templateContext);
        if (indentLevel > 0) {
          const indent = '  '.repeat(indentLevel);
          // Every non-empty line, including the first -- indenting only after each `\n` left the partial's
          // First line at column 0 and pushed the caller's next line out by one indent.
          rendered = rendered.replaceAll(/^(?<Content>.+)$/gm, `${indent}$<Content>`);
        }
        result += rendered;
      }
      currentTemplatePath = previousTemplatePath;
      renderRoot = previousRenderRoot;
      return result;
    },
    /**
     * Sorts a block of `import` statements a template composed from partials, by the module each names.
     *
     * A section that contributes imports emits them in PARTIAL order, which is the order the answers were
     * registered in {@link FEATURE_REGISTRIES} -- and that has nothing to do with the order an
     * import-sorting lint rule wants. The obsidian-dev-utils presets now adopt that package's shared
     * ESLint config, which sorts imports as an ERROR, so `uiFramework=lit editorExtensions=codemirror`
     * emitted a `src/plugin.ts` that was red the moment it was generated. The sorting cannot be pushed
     * into the partials: each one knows only itself, and which others are beside it is the answer set.
     */
    sortImports(text: string): string {
      return sortImportStatements(text);
    }
  };

  const skipped: string[] = [];
  const updated: string[] = [];
  const created: string[] = [];

  for (const registeredPath of templateFiles) {
    const destinationPath = getDestinationPath(registeredPath, answers);
    const fullDestinationPath = join(targetDir, destinationPath);
    const isAsset = ASSET_EXTENSIONS.has(extname(registeredPath));
    const ejsPath = findTemplate(`${registeredPath}.ejs`);

    let rendered: Buffer | string;
    if (isAsset) {
      // No `.ejs` suffix: an asset template is the emitted file, byte for byte.
      currentTemplatePath = registeredPath;
      rendered = readFileSync(findTemplate(registeredPath) ?? join(templatesDir, registeredPath));
    } else if (ejsPath === null) {
      currentTemplatePath = `${registeredPath}.ejs`;
      rendered = (templateContext['render'] as (section?: string) => string)();
    } else {
      currentTemplatePath = `${registeredPath}.ejs`;
      try {
        // eslint-disable-next-line import-x/no-named-as-default-member -- This is the standard EJS API.
        rendered = ejs.render(readFileSync(ejsPath, 'utf-8'), templateContext);
      } catch (error: unknown) {
        // A built-in template that is not valid EJS is emitted as written. An overlay's is the user's own
        // Mistake, and emitting its raw `<%` source into the project would hide it.
        if (overlay && ejsPath.startsWith(overlay.dir)) {
          throw new Error(`${ejsPath} failed to render: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
        rendered = readFileSync(ejsPath, 'utf-8');
      }
    }

    const newHash = sha256(rendered);
    newConfig.fileHashes[destinationPath] = newHash;

    if (existingConfig && existsSync(fullDestinationPath)) {
      const currentContent = isAsset ? readFileSync(fullDestinationPath) : readFileSync(fullDestinationPath, 'utf-8');
      const currentHash = sha256(currentContent);
      const originalHash = existingConfig.fileHashes[destinationPath];

      if (currentHash === newHash) {
        continue;
      }

      if (originalHash && currentHash !== originalHash) {
        skipped.push(destinationPath);
        // Keep the hash the generator wrote, not the user's. Recording the user's made the next update read
        // The edit as untouched and overwrite it, reported as an ordinary "Updated". The file stays skipped
        // Until it matches a render again, or the user deletes it to take the generator's version back.
        newConfig.fileHashes[destinationPath] = originalHash;
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

/**
 * Resolves a registered template path to the path the generated project gets, substituting answers.
 *
 * Exported so the plan-level checks decide "do two registered files land on the same destination?" by
 * the same rule the generator writes them, rather than by a second copy of it that could drift.
 */
export function getDestinationPath(templatePath: string, answers: Answers): string {
  return templatePath.replace(/%= (?<AnswerKey>.+?) %/g, (_match: string, ...args: unknown[]) => String(answers[String(args[0]) as keyof Answers]));
}

export function getScriptDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

/**
 * Whether a template file on disk is a partial rather than a template of its own.
 *
 * A partial is `<base>_<partialName>.ejs` or `<base>@<section>_<partialName>.ejs`, so the tail after the
 * LAST `_` decides, and only when that tail is a partial name -- which {@link PARTIAL_NAME_PATTERN} makes
 * kebab-case. `bug_report.yml.ejs` ends in `report.yml`, which no partial can be called, so it is a plain
 * template and emits `bug_report.yml`. Reading any `_` as the marker is what made the real plugins' own
 * issue-template names impossible to emit: the file was silently skipped, and everything that checked
 * for the directory still passed.
 *
 * Only a path on disk is classified. A registered path never names a partial -- `addFiles` takes the
 * emitted file's path, and `render()` builds each partial's name itself -- so the render loop does not ask.
 */
export function isPartialTemplatePath(templatePath: string): boolean {
  const fileName = (templatePath.split('/').pop() ?? '').replace(/\.ejs$/, '');
  const markerIndex = fileName.lastIndexOf('_');
  return markerIndex > 0 && PARTIAL_NAME_PATTERN.test(fileName.slice(markerIndex + 1));
}

export function loadConfig(dir: string): GeneratorConfig | null {
  const configPath = join(dir, CONFIG_FILE_NAME);
  if (!existsSync(configPath)) {
    return null;
  }
  const parsed: unknown = JSON.parse(readFileSync(configPath, 'utf-8'));
  const raw = parsed as Record<string, unknown>;
  migrateAnswers(raw);
  return parsed as GeneratorConfig;
}

/**
 * Sorts a run of `import` statements by the module each one names.
 *
 * A statement may span several lines -- a named-import list is written one name per line here -- so a
 * new statement starts only at a line beginning with `import `, and every other line belongs to the
 * statement above it. Blocks are compared by the specifier in their trailing `from '...'`, which is what an import-sorting lint rule
 * asks for within one group. A side-effect import (`import './x.ts';`) has no `from`, and its own text
 * is then the key.
 *
 * A run of `//` comment lines directly above an `import` belongs to it and travels with it. Without that,
 * an `eslint-disable-next-line` written above one import was carried along by the one BEFORE it and
 * landed on whatever the sort put next -- which is both an unused directive and a live violation on the
 * statement it left behind. This is a line walk rather than a split for that reason: splitting on the
 * newline before `import ` ALSO fires between a comment and the import under it, which cuts the comment
 * loose as a block of its own, sorted by its own text.
 */
export function sortImportStatements(text: string): string {
  const blocks: string[][] = [];
  let pendingComments: string[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') {
      continue;
    }

    if (line.startsWith('import ')) {
      blocks.push([...pendingComments, line]);
      pendingComments = [];
    } else if (line.startsWith('//')) {
      pendingComments.push(line);
    } else {
      blocks.at(-1)?.push(line);
    }
  }

  if (blocks.length === 0) {
    return text;
  }

  // A comment with no import below it stays last, where it was.
  blocks.at(-1)?.push(...pendingComments);
  const statements = blocks.map((block) => block.join('\n'));
  statements.sort((a, b) => importedModule(a).localeCompare(importedModule(b)));
  return `${statements.join('\n')}\n`;
}

/**
 * Registers what an overlay declares. Its templates need no registration: `copyTemplates` finds them by path.
 */
function applyOverlay(builder: TemplateBuilder, overlay: Overlay): void {
  builder.addFiles([...overlay.files]);
  for (const packageName of overlay.packages) {
    builder.addPackage(packageName);
  }
  for (const badge of overlay.badges) {
    builder.addBadge(badge);
  }
  for (const partial of overlay.partials) {
    builder.addPartial(partial);
  }
}

/**
 * Whether a demo override and the answer actually chosen want different JSX runtimes.
 *
 * The demo preset deliberately forces a SECOND answer into a question so the demo vault shows every
 * feature -- and that works for everything except the one setting a project can only hold one of.
 * `jsx` / `jsxImportSource` are compiler options, not per-file ones, and they are global twice over: once
 * in `tsconfig.json`, once more in whichever bundler config was chosen (`build.ts@bundler_esbuild@options_*`
 * writes them directly, `rollup.config.ts@post-plugin_*` a whole `babel({...})` block, `vite.config.ts` a
 * plugin). Forcing react in beside `preact` or `solid` therefore emitted a duplicate `"jsx"` key and
 * components compiled against the wrong runtime -- TS2345, `Element` is not assignable.
 *
 * So the explicit answer wins and the override is skipped, which is the same call the demo + biome linter
 * case already makes (see `src/templates.test.ts`). Only the three JSX frameworks declare a
 * `jsxImportSource`: `svelte` and `vue` compile their own single-file components and `lit` uses tagged
 * templates, so all three stay forced beside anything.
 */
function conflictsOverJsxRuntime(chosen: FeatureOption, demo: FeatureOption): boolean {
  return chosen.jsxImportSource !== undefined
    && demo.jsxImportSource !== undefined
    && chosen.jsxImportSource !== demo.jsxImportSource;
}

/**
 * The funding values the templates read, all derived from the one resolved platform.
 *
 * `fundingUrl` overrides the stored answer, so the manifest, the README and `FUNDING.yml` cannot disagree.
 * The stored answer is only ever what is shown for `custom`, the one platform with no handle.
 */
function getFundingTemplateContext(answers: Answers): Record<string, string> {
  const funding = resolveFunding(answers);
  return {
    _fundingYmlKey: funding?.fundingYmlKey ?? '',
    _fundingYmlValue: funding?.getFundingYmlValue(answers) ?? '',
    fundingUrl: funding?.getUrl(answers) ?? ''
  };
}

function importedModule(block: string): string {
  return /(?:from )?'(?<Module>[^']+)';$/.exec(block)?.groups?.['Module'] ?? block;
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

function migrateAnswers(raw: Record<string, unknown>): void {
  const answers = raw['answers'] as Record<string, unknown> | undefined;
  if (!answers) {
    return;
  }
  if (answers['framework'] && !answers['uiFramework']) {
    answers['uiFramework'] = answers['framework'];
    delete answers['framework'];
  }
  if (answers['cssMode'] && !answers['styling']) {
    answers['styling'] = answers['cssMode'];
    delete answers['cssMode'];
  }
  if (answers['buildSystem'] && !answers['bundler']) {
    answers['bundler'] = answers['buildSystem'];
    delete answers['buildSystem'];
  }
  // Projects generated before the branch was configurable have no answer to carry forward, and the
  // Workflow they were emitted with hardcoded `master`. Migrating to that -- not to the new `main`
  // Default -- is what leaves their `ci.yml` byte-identical, so an update reports no change instead of
  // Silently retargeting a CI trigger. Re-prompting is how they opt into `main`.
  answers['defaultBranch'] ??= 'master';
  migrateFundingAnswers(answers);
  // Unread unless the platform takes a handle, but every answer set carries one -- the prompt's default.
  answers['fundingUsername'] ??= answers['authorGitHubName'];
  // Every project generated before the badge was an answer had none.
  answers['coverageBadge'] ??= 'none';
  // Once a stored answer, now derived from `pluginId` at render time; a stale copy must not reach the context.
  delete answers['pluginShortName'];
}

/**
 * Turns the old free-text `fundingUrl` plus the `gitHubFunding` on/off switch into a platform and handle.
 *
 * A URL on a known platform becomes that platform and the handle in it; any other URL becomes `custom`,
 * which keeps it verbatim. No URL means `none` whatever `gitHubFunding` said: the `FUNDING.yml` that switch
 * emitted listed every platform blank, which GitHub renders as no funding at all, so there is nothing to
 * carry forward.
 */
function migrateFundingAnswers(answers: Record<string, unknown>): void {
  if (answers['fundingPlatform'] !== undefined) {
    return;
  }
  delete answers['gitHubFunding'];

  const url = typeof answers['fundingUrl'] === 'string' ? answers['fundingUrl'] : '';
  if (!url) {
    answers['fundingPlatform'] = 'none';
    answers['fundingUrl'] = '';
    return;
  }

  // `www.` is optional on both sides: the old default was `https://buymeacoffee.com/<name>`, and every real
  // Plugin links to `https://www.buymeacoffee.com/<name>`.
  function stripWww(value: string): string {
    return value.replace('://www.', '://');
  }

  for (const option of FUNDING_PLATFORM_OPTIONS) {
    const prefix = stripWww(option.getUrl({ fundingUrl: '', fundingUsername: '' } as Answers));
    const normalizedUrl = stripWww(url);
    if (!prefix || !normalizedUrl.startsWith(prefix)) {
      continue;
    }
    const handle = normalizedUrl.slice(prefix.length).replace(/\/$/, '');
    if (!validateFundingUsername(handle)) {
      answers['fundingPlatform'] = option.settingValue;
      answers['fundingUsername'] = handle;
      answers['fundingUrl'] = '';
      return;
    }
  }

  answers['fundingPlatform'] = 'custom';
}

function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}
