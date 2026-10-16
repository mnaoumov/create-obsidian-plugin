import {
  mkdtempSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  ANSWER_SPACE,
  makeAnswers
} from './answer-space.ts';
import { listGeneratedFiles } from './plugin-drift-checks.ts';
import { copyTemplates } from './templates.ts';

/**
 * The goal these tables measure: on a dev-utils preset, every tool the generator offers is run by
 * `@mnaoumov/obsidian-dev-toolkit` or `@mnaoumov/typescript-dev-toolkit`, and the generated project carries
 * a thin call into it rather than tool code of its own. Generic tooling belongs in typescript-dev-toolkit and
 * its Obsidian layer in obsidian-dev-toolkit, so a fix to either reaches every project by `npm update`.
 *
 * Every answer value is in exactly one of the three tables, keyed `question=value`, or `question` for a
 * question none of whose answers is a tool. So a new option cannot be added without saying which it is.
 * `none` is exempt everywhere: choosing no tool emits no tool code.
 */

/**
 * Answers the toolkits run, each with the toolkit module the emitted `enhanced` project imports to do it.
 * The test renders that answer and fails unless some emitted file imports the module.
 */
const TOOLKIT_BACKED: Readonly<Record<string, string>> = {
  'bundler=esbuild': '@mnaoumov/obsidian-dev-toolkit/bundlers/esbuild',
  'commitLinting=conventional-commits': '@mnaoumov/typescript-dev-toolkit/commitlint-config',
  'formatter=dprint': '@mnaoumov/obsidian-dev-toolkit/formatters/dprint',
  // The esbuild builder writes the `.hotreload` marker and copies the build into the vault itself.
  'hotReload=hot-reload-plugin': '@mnaoumov/obsidian-dev-toolkit/bundlers/esbuild',
  'linter=eslint': '@mnaoumov/obsidian-dev-toolkit/linters/eslint',
  'markdownLinter=markdownlint': '@mnaoumov/obsidian-dev-toolkit/linters/markdownlint',
  'spellChecker=cspell': '@mnaoumov/typescript-dev-toolkit/linters/cspell',
  // The esbuild builder bundles plain CSS and names it `styles.css`, and registers its own sass plugin.
  'styling=css': '@mnaoumov/obsidian-dev-toolkit/bundlers/esbuild',
  'styling=scss': '@mnaoumov/obsidian-dev-toolkit/bundlers/esbuild',
  'testRunner=vitest': '@mnaoumov/typescript-dev-toolkit/test-runners/vitest',
  // The esbuild builder registers its own svelte plugin.
  'uiFramework=svelte': '@mnaoumov/obsidian-dev-toolkit/bundlers/esbuild'
};

/**
 * Answers that are tools the toolkits do not run yet, each with what they lack. The generated project
 * carries that tool's code itself until they do. Move an entry to {@link TOOLKIT_BACKED} when its toolkit
 * support ships and the templates switch over to it.
 */
const AWAITING_TOOLKIT: Readonly<Record<string, string>> = {
  'bundler=parcel': 'obsidian-dev-toolkit has no parcel builder; the project carries its config and two parcel plugins.',
  'bundler=rollup': 'obsidian-dev-toolkit has no rollup builder; the project carries its config.',
  'bundler=vite': 'obsidian-dev-toolkit has no vite builder; the project carries its config.',
  'bundler=webpack': 'obsidian-dev-toolkit has no webpack builder; the project carries its config.',
  'coverageBadge=coverage-badge': 'no toolkit publishes the coverage badge.',
  'e2eTestRunner=obsidian-test': 'the toolkits run end-to-end tests only through obsidian-integration-testing.',
  'e2eTestRunner=wdio-obsidian': 'the toolkits run end-to-end tests only through obsidian-integration-testing.',
  'formatter=biome': 'typescript-dev-toolkit has no biome formatter runner; the project shells out to it.',
  'formatter=prettier': 'typescript-dev-toolkit has no prettier runner; the project shells out to it.',
  'gitHubActions=ci': 'no toolkit ships a reusable CI workflow; the project carries its own.',
  'gitHubActions=ci-and-release': 'no toolkit ships reusable CI and release workflows; the project carries its own.',
  'hotReload=obsidian-cli': 'obsidian-dev-toolkit has no obsidian-cli reload; the project runs the command itself.',
  'linter=biome': 'typescript-dev-toolkit has no biome linter runner; the project shells out to it.',
  'styling=css-modules': 'the esbuild builder has no CSS-modules support; the project carries the plugin and its options.',
  'styling=postcss': 'the esbuild builder runs no PostCSS; the project carries its config and a styles pre-build.',
  'styling=tailwind': 'the esbuild builder runs no Tailwind; the project carries its config and a styles pre-build.',
  'testRunner=jest': 'the toolkits offer only a jest setup file; the project carries its config and runner script.',
  'uiFramework=preact': 'the esbuild builder sets no JSX runtime; the project carries the JSX options.',
  'uiFramework=react': 'the esbuild builder sets no JSX runtime; the project carries the JSX options.',
  'uiFramework=solid': 'the esbuild builder has no solid plugin; the project carries it and the JSX options.',
  'uiFramework=vue': 'the esbuild builder has no vue plugin; the project registers one through `customEsbuildPlugins`.',
  'wasmSupport=wasm': 'the esbuild builder has no WebAssembly loader; the project carries the loader options.'
};

/**
 * Answers that are not tooling at all, each with why. A runtime library the plugin imports is configured
 * by the project, because it is part of what the plugin is.
 */
const NOT_TOOLKIT_CONCERN: Readonly<Record<string, string>> = {
  'apiSubset': 'which Obsidian typings the plugin compiles against.',
  'editorExtensions=codemirror': 'a runtime library the plugin imports.',
  'fundingPlatform': 'manifest and README content.',
  'fundingUrl': 'manifest and README content.',
  'gitHubIssueTemplates=bug-and-feature': 'repository content, not a tool.',
  'internationalization=i18next': 'a runtime library the plugin imports.',
  'internationalization=typesafe-i18n': 'a runtime library the plugin imports.',
  'obsidianConfigFolder': 'where the build is copied, which the builder already reads.',
  'packageManager': 'the toolkits detect the package manager from the lockfile.',
  'platformSupport': 'manifest content.',
  'preset': 'the question that chooses the toolkits at all.',
  'uiFramework=lit': 'a runtime library compiled as plain TypeScript, with nothing for a bundler plugin to do.'
};

const TABLES: Readonly<Record<string, Readonly<Record<string, string>>>> = { AWAITING_TOOLKIT, NOT_TOOLKIT_CONCERN, TOOLKIT_BACKED };

describe('toolkit parity', () => {
  it('classifies every answer value in exactly one table', () => {
    for (const dimension of ANSWER_SPACE) {
      for (const value of dimension.values) {
        if (value === 'none') {
          continue;
        }
        const keys = [dimension.answerKey, `${dimension.answerKey}=${value}`];
        const tables = Object.entries(TABLES).filter(([, table]) => keys.some((key) => Object.hasOwn(table, key))).map(([name]) => name);
        expect(tables, `${dimension.answerKey}=${value}`).toHaveLength(1);
      }
    }
  });

  it('names no answer the generator does not offer', () => {
    const offered = new Set(ANSWER_SPACE.flatMap((dimension) => [dimension.answerKey, ...dimension.values.map((value) => `${dimension.answerKey}=${value}`)]));
    for (const table of Object.values(TABLES)) {
      for (const key of Object.keys(table)) {
        expect(offered.has(key), key).toBe(true);
      }
    }
  });

  it.each(Object.entries(TOOLKIT_BACKED))('%s is run through %s', (key, moduleSpecifier) => {
    const [answerKey = '', value = ''] = key.split('=');
    const targetDir = mkdtempSync(join(tmpdir(), 'toolkit-parity-'));
    try {
      copyTemplates(makeAnswers({ [answerKey]: value, preset: 'enhanced' }), targetDir, '0.0.0', null);
      const importers = listGeneratedFiles(targetDir)
        .filter((file) => /\.(?:mjs|mts|ts)$/.test(file))
        .filter((file) => readFileSync(join(targetDir, file), 'utf-8').includes(`from '${moduleSpecifier}'`));
      expect(importers, key).not.toEqual([]);
    } finally {
      rmSync(targetDir, { force: true, recursive: true });
    }
  });
});
