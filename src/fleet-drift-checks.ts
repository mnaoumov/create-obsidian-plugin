import type {
  ClassDeclaration,
  ImportDeclaration,
  SourceFile,
  Statement
} from 'typescript';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs';
import { join } from 'node:path';
import {
  canHaveModifiers,
  createSourceFile,
  getModifiers,
  isClassDeclaration,
  isEnumDeclaration,
  isFunctionDeclaration,
  isImportDeclaration,
  isInterfaceDeclaration,
  isNamedImports,
  isNamespaceImport,
  isStringLiteral,
  isTypeAliasDeclaration,
  isVariableStatement,
  ScriptTarget,
  SyntaxKind
} from 'typescript';

import type { Answers } from './answers.ts';

import { makeAnswers } from './answer-space.ts';

/** One accepted difference, as recorded in `fleet-drift-baseline.json`. */
export interface BaselineEntry {
  /** How many plugins carried the trait when the entry was written, so a moved count is re-reported. */
  fleetCount: number;
  /** The condition that makes the difference deliberate, in enough detail to re-judge it later. */
  why: string;
}

/** One way the recorded baseline and the findings fail to correspond. */
export interface BaselineViolation {
  detail: string;
  /** The `<dimension>/<kind>/<key>` the entry is filed under. */
  key: string;
  kind: BaselineViolationKind;
}

/**
 * How a baseline and the findings can fail to correspond.
 *
 * All three matter equally, for the reason G100 gives about `pinned-versions.json`: a record that
 * silently drifts from what it describes is worse than no record. `stale-baseline-entry` is the one
 * that is easy to forget -- fixing a drift without deleting its entry leaves the file claiming a
 * difference that no longer exists.
 */
export type BaselineViolationKind =
  | 'baseline-count-moved'
  | 'stale-baseline-entry'
  | 'unbaselined-drift';

/**
 * What is being compared.
 *
 * Dependencies and tsconfig `types` are deliberately absent. T699-P42 already settled both by following
 * the fleet -- the generator now installs `@obsidian-typings/obsidian-public-latest` and names it in
 * `types` -- so re-reporting them here would re-litigate a closed decision rather than find anything.
 */
export type DriftDimension =
  | 'layout'
  | 'odu-modules'
  | 'plugin-shape'
  | 'scripts'
  | 'workflows';

/** One way the generated project and the fleet disagree. */
export interface DriftFinding {
  dimension: DriftDimension;
  /** How many of the fleet's plugins carry this trait. */
  fleetCount: number;
  /** How many plugins were compared, so `fleetCount` can be read as a proportion. */
  fleetTotal: number;
  /** The fleet's consensus value, or `''` when the trait is presence-only. */
  fleetValue: string;
  /** The generated project's value, or `null` when it does not carry the trait at all. */
  generatedValue: null | string;
  key: string;
  kind: DriftKind;
}

/**
 * How the generated project differs from the fleet on one trait.
 *
 * `partial` is separate from `missing` because the two need different judgements. A trait every plugin
 * has and the generator lacks is a gap; a trait 25 of 29 have is a call about whether the scaffold
 * should take a side, and the count is the whole of the evidence for making it.
 */
export type DriftKind =
  | 'differs'
  | 'extra'
  | 'missing'
  | 'partial';

/** What the fleet agrees on, and how strongly. */
export interface FleetConsensus {
  /** How many plugins were profiled. */
  total: number;
  traits: ReadonlyMap<DriftDimension, ReadonlyMap<string, FleetTrait>>;
}

/** One trait as the fleet holds it. */
export interface FleetTrait {
  /** How many plugins carry the trait at all. */
  count: number;
  /** The most common value among the plugins that carry it. */
  value: string;
}

/** A project reduced to the traits this tier compares: dimension, then trait key, then trait value. */
export type ProjectProfile = ReadonlyMap<DriftDimension, ReadonlyMap<string, string>>;

/** The one field this tier reads out of a `package.json`. */
interface PackageJsonScripts {
  scripts?: Record<string, string>;
}

/**
 * The answers that reproduce what the fleet actually is.
 *
 * The load-bearing decision of this tier. Comparing a `webpack + biome + jest` generation against the
 * fleet would report drift that is really just "the user answered differently" -- noise that would
 * swamp the signal and make the baseline meaningless. Every value below was measured across the fleet
 * rather than chosen: vitest and esbuild are unanimous, `@obsidian-typings/obsidian-public-latest` is
 * in all 29 `devDependencies` (so `with-unofficial`), 27 of 29 manifests say `isDesktopOnly: false`,
 * all 29 carry `.github/FUNDING.yml` and an `ISSUE_TEMPLATE/` directory, and 24 of 29 lint commits.
 *
 * `gitHubActions: 'none'` is the one that reads oddly and is the most important. No fleet plugin has a
 * `ci.yml` or a `release.yml`; asking for them would report the generator's own CI workflows as drift
 * the fleet chose not to have, and would bury the finding that actually matters -- that the one
 * workflow all 29 DO ship is emitted by no answer at all.
 */
export const FLEET_SHAPED_ANSWERS: Readonly<Partial<Answers>> = {
  apiSubset: 'with-unofficial',
  bundler: 'esbuild',
  commitLinting: 'conventional-commits',
  e2eTestRunner: 'none',
  editorExtensions: 'none',
  formatter: 'dprint',
  fundingUrl: 'https://buymeacoffee.com/testuser',
  gitHubActions: 'none',
  gitHubFunding: 'funding-yml',
  gitHubIssueTemplates: 'bug-and-feature',
  hotReload: 'none',
  internationalization: 'none',
  linter: 'eslint',
  markdownLinter: 'markdownlint',
  packageManager: 'npm',
  platformSupport: 'desktop-and-mobile',
  spellChecker: 'cspell',
  styling: 'scss',
  testRunner: 'vitest',
  uiFramework: 'none',
  wasmSupport: 'none'
};

/** The two files that make a directory one of the fleet's plugins -- the same test PROJECTS.md applies. */
const FLEET_MARKER_FILES = ['manifest.json', 'src/main.ts'];

/**
 * Directories never walked on the generated side.
 *
 * The fleet side does not need them: `git ls-files` reports only tracked paths, and every one of these
 * is ignored in every fleet repo.
 */
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules'
]);

/**
 * Files excluded from the `layout` dimension on both sides.
 *
 * Each is an artefact of running or installing the project rather than of scaffolding it, so its
 * presence says nothing about whether the two shapes agree. The lockfiles are the reason this list
 * exists at all: every fleet repo tracks one and no freshly generated project has one, because the
 * install that writes it has not happened yet.
 */
const IGNORED_FILES = new Set([
  '.env',
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  'pnpm-lock.yaml',
  'tsconfig.tsbuildinfo',
  'yarn.lock'
]);

/** 32 MiB -- far beyond what `git ls-files` needs on the largest fleet repo, which lists a few hundred paths. */
const MAX_GIT_OUTPUT = 33_554_432;

/**
 * The share of the fleet that must carry a trait before its absence is worth reporting as `partial`.
 *
 * Without a floor this dimension is unusable rather than merely noisy: the first run produced 1793
 * findings, and all but a few dozen were a single plugin's own content -- every note, screenshot and
 * vendored `node_modules` file under one demo vault, each carried by exactly 1 of 29 and each reported
 * as something the generator "emits nothing" for. Below a majority the fleet does not have a shape to
 * match; it has one plugin's contents. A majority is also the honest reading of the question the
 * `partial` kind exists to ask -- whether the scaffold should take the fleet's side on something the
 * fleet itself is divided about.
 */
const PARTIAL_REPORTING_FLOOR = 0.5;

/** The `src/` files whose shape the `plugin-shape` dimension reads. */
const PLUGIN_SHAPE_FILES = [
  'src/main.ts',
  'src/plugin.ts',
  'src/plugin-settings.ts',
  'src/plugin-settings-component.ts',
  'src/plugin-settings-tab.ts'
];

const WORKFLOWS_PREFIX = '.github/workflows/';

/**
 * Reduces the profiled fleet to what it agrees on.
 *
 * A trait's value can differ between plugins that both carry it, so the consensus value is the most
 * common one, and ties break on the value itself -- which keeps the result stable across runs rather
 * than dependent on the order the directories happened to be read in.
 */
export function buildConsensus(profiles: readonly ProjectProfile[]): FleetConsensus {
  const valueCounts = new Map<DriftDimension, Map<string, Map<string, number>>>();

  for (const profile of profiles) {
    for (const [dimension, dimensionTraits] of profile) {
      const dimensionCounts = valueCounts.get(dimension) ?? new Map<string, Map<string, number>>();
      valueCounts.set(dimension, dimensionCounts);

      for (const [key, value] of dimensionTraits) {
        const counts = dimensionCounts.get(key) ?? new Map<string, number>();
        dimensionCounts.set(key, counts);
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
  }

  const traits = new Map<DriftDimension, ReadonlyMap<string, FleetTrait>>();
  for (const [dimension, dimensionCounts] of valueCounts) {
    const dimensionTraits = new Map<string, FleetTrait>();
    traits.set(dimension, dimensionTraits);

    for (const [key, counts] of dimensionCounts) {
      let total = 0;
      let best = '';
      let bestCount = -1;
      for (const [value, count] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
        total += count;
        if (count > bestCount) {
          best = value;
          bestCount = count;
        }
      }
      dimensionTraits.set(key, { count: total, value: best });
    }
  }

  return { total: profiles.length, traits };
}

/**
 * Every way the generated project disagrees with the fleet.
 *
 * Only unanimous traits produce a `missing` or a `differs`: a scaffold cannot be called wrong for
 * lacking something two thirds of the fleet also lack. A trait no fleet plugin has is `extra`, and one
 * that most but not all carry is `partial` -- reported only when the generator lacks it (a generator
 * that already has it is on the majority's side, so there is nothing left to decide) and only above
 * {@link PARTIAL_REPORTING_FLOOR}, without which this drowns in one plugin's own content.
 */
export function compareToFleet(consensus: FleetConsensus, generated: ProjectProfile): DriftFinding[] {
  const findings: DriftFinding[] = [];

  // The union, not the fleet's dimensions alone: a dimension the fleet has no trait in at all would
  // Otherwise never be scanned, and everything the generator emits under it would go unreported.
  const dimensions = new Set<DriftDimension>([...consensus.traits.keys(), ...generated.keys()]);

  for (const dimension of dimensions) {
    const fleetTraits = consensus.traits.get(dimension) ?? new Map<string, FleetTrait>();
    const generatedTraits = generated.get(dimension) ?? new Map<string, string>();

    for (const [key, trait] of fleetTraits) {
      const generatedValue = generatedTraits.get(key) ?? null;
      const base = {
        dimension,
        fleetCount: trait.count,
        fleetTotal: consensus.total,
        fleetValue: trait.value,
        generatedValue,
        key
      };

      if (trait.count < consensus.total) {
        if (generatedValue === null && trait.count >= consensus.total * PARTIAL_REPORTING_FLOOR) {
          findings.push({ ...base, kind: 'partial' });
        }
        continue;
      }

      if (generatedValue === null) {
        findings.push({ ...base, kind: 'missing' });
      } else if (generatedValue !== trait.value) {
        findings.push({ ...base, kind: 'differs' });
      }
    }

    for (const [key, value] of generatedTraits) {
      if (!fleetTraits.has(key)) {
        findings.push({
          dimension,
          fleetCount: 0,
          fleetTotal: consensus.total,
          fleetValue: '',
          generatedValue: value,
          key,
          kind: 'extra'
        });
      }
    }
  }

  return findings.sort((a, b) => traitKey(a).localeCompare(traitKey(b)));
}

/** One finding, as a line a reader can act on. */
export function describeFinding(finding: DriftFinding): string {
  const proportion = `${String(finding.fleetCount)}/${String(finding.fleetTotal)}`;
  const descriptions: Record<DriftKind, string> = {
    differs: `The fleet (${proportion}) has ${JSON.stringify(finding.fleetValue)}; the generator emits ${JSON.stringify(finding.generatedValue)}.`,
    extra: `The generator emits ${JSON.stringify(finding.generatedValue)}; no fleet plugin has this.`,
    missing: `Every fleet plugin (${proportion}) has this; the generator emits nothing.`,
    partial: `${proportion} of the fleet have this; the generator emits nothing.`
  };

  return descriptions[finding.kind];
}

/**
 * The fleet's plugin directories under `rootDir`.
 *
 * The membership test is PROJECTS.md's, applied to the filesystem rather than copied from it: a
 * `manifest.json` and a `src/main.ts` in the repo root. Reading the roster instead would tie this repo
 * to a file outside it and inherit whatever that file has drifted into -- it currently says 28 and
 * omits a plugin that is plainly on disk.
 */
export function discoverFleet(rootDir: string): string[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const found: string[] = [];
  for (const entry of readdirSync(rootDir)) {
    const candidate = join(rootDir, entry);
    if (!statSync(candidate).isDirectory()) {
      continue;
    }
    if (FLEET_MARKER_FILES.every((marker) => existsSync(join(candidate, marker)))) {
      found.push(candidate);
    }
  }

  return found.sort((a, b) => a.localeCompare(b));
}

/**
 * Reduces one project to its comparable traits.
 *
 * The same function runs over a real plugin and over a generated project, so the two sides cannot drift
 * into meaning different things by "scripts" or "layout". Only the file enumeration differs, and that is
 * passed in: {@link listTrackedFiles} for a checkout, {@link listGeneratedFiles} for a fresh render.
 */
export function extractProfile(projectDir: string, files: readonly string[]): ProjectProfile {
  const relevant = files.filter((file) => !IGNORED_FILES.has(lastSegment(file)));

  return new Map<DriftDimension, ReadonlyMap<string, string>>([
    ['layout', new Map(relevant.map((file) => [file, '']))],
    ['odu-modules', extractOduModules(projectDir, relevant)],
    ['plugin-shape', extractPluginShape(projectDir)],
    ['scripts', extractScripts(projectDir)],
    ['workflows', new Map(relevant.filter((file) => file.startsWith(WORKFLOWS_PREFIX)).map((file) => [file, '']))]
  ]);
}

/**
 * The `<scope>/<dimension>/<kind>/<key>` a finding is filed under in the baseline.
 *
 * The scope is the preset the case was generated for, and it is part of the key rather than dropped
 * because the presets do not emit the same project. Without it, baselining a `demo`-only extra -- one of
 * the framework components that preset forces in -- would silence the same key under `enhanced`, where
 * it would be a genuine surprise.
 */
export function findingKey(finding: DriftFinding, scope: string): string {
  return `${scope}/${traitKey(finding)}`;
}

/** The complete answers for one preset, shaped like the fleet. */
export function fleetShapedAnswers(preset: string): Answers {
  return makeAnswers({ ...FLEET_SHAPED_ANSWERS, preset });
}

/**
 * Every file in a freshly generated project.
 *
 * A walk rather than `git ls-files`, because the generator emits into a directory that is not yet a
 * repository -- `git init` runs later, in `main.ts`, and never during verification.
 */
export function listGeneratedFiles(projectDir: string): string[] {
  return walk(projectDir, '').sort((a, b) => a.localeCompare(b));
}

/**
 * Every file a fleet plugin tracks.
 *
 * `git ls-files` and not a walk: a checkout carries `node_modules`, build output and a real Obsidian
 * vault's worth of untracked state, and what the repo actually consists of is exactly the tracked set.
 * A directory that is not a repository yields nothing, which the caller reports rather than averaging
 * into the consensus as a plugin that happens to contain no files.
 */
export function listTrackedFiles(projectDir: string): string[] {
  const result = spawnSync('git', ['ls-files'], { cwd: projectDir, encoding: 'utf-8', maxBuffer: MAX_GIT_OUTPUT });
  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Checks the findings against the recorded baseline, in both directions.
 *
 * Both directions, because only one of them is the obvious one. New drift with no entry fails, which is
 * what makes this a gate rather than a report; but an entry whose drift has gone also fails, so that
 * fixing something and forgetting to delete its justification cannot leave the file describing a
 * difference that no longer exists. A moved `fleetCount` fails too -- the count IS the evidence behind
 * most of these judgements, and a trait that went from 25 of 29 to 29 of 29 needs the call made again.
 */
export function reconcileBaseline(findingsByScope: ReadonlyMap<string, readonly DriftFinding[]>, baseline: Readonly<Record<string, BaselineEntry>>): BaselineViolation[] {
  const violations: BaselineViolation[] = [];
  const seen = new Set<string>();

  for (const [scope, findings] of findingsByScope) {
    for (const finding of findings) {
      const key = findingKey(finding, scope);
      seen.add(key);
      const entry = baseline[key];

      if (!entry) {
        violations.push({
          detail: describeFinding(finding),
          key,
          kind: 'unbaselined-drift'
        });
        continue;
      }

      if (entry.fleetCount !== finding.fleetCount) {
        violations.push({
          detail: `Recorded at ${String(entry.fleetCount)} of the fleet, now ${String(finding.fleetCount)} of ${String(finding.fleetTotal)}. Re-judge: ${entry.why}`,
          key,
          kind: 'baseline-count-moved'
        });
      }
    }
  }

  for (const key of Object.keys(baseline).sort((a, b) => a.localeCompare(b))) {
    if (!seen.has(key)) {
      violations.push({
        detail: `No such difference any more. Delete the entry: ${baseline[key]?.why ?? ''}`,
        key,
        kind: 'stale-baseline-entry'
      });
    }
  }

  return violations;
}

function baseClassName(declaration: ClassDeclaration): null | string {
  for (const clause of declaration.heritageClauses ?? []) {
    if (clause.token !== SyntaxKind.ExtendsKeyword) {
      continue;
    }
    const [first] = clause.types;
    if (first) {
      return first.expression.getText();
    }
  }
  return null;
}

function exportedNames(statement: Statement): string[] {
  if (!isExported(statement)) {
    return [];
  }

  if (
    isClassDeclaration(statement)
    || isEnumDeclaration(statement)
    || isFunctionDeclaration(statement)
    || isInterfaceDeclaration(statement)
    || isTypeAliasDeclaration(statement)
  ) {
    return statement.name ? [statement.name.text] : [];
  }

  if (isVariableStatement(statement)) {
    return statement.declarationList.declarations.map((declaration) => declaration.name.getText());
  }

  return [];
}

/**
 * Which `obsidian-dev-utils` module each `scripts/*.ts` wraps, and what it takes from it.
 *
 * The named imports are part of the trait rather than just the specifier, because the whole point of
 * the two-tier script strategy is that each script is a thin wrapper around one named function -- so
 * `buildClean` versus `buildCompileTypeScript` out of the same `script-utils/build` module is exactly
 * the difference worth catching.
 */
function extractOduModules(projectDir: string, files: readonly string[]): Map<string, string> {
  const traits = new Map<string, string>();

  for (const file of files) {
    if (!file.startsWith('scripts/') || !file.endsWith('.ts')) {
      continue;
    }

    const source = parseSource(projectDir, file);
    if (!source) {
      continue;
    }

    const wrapped: string[] = [];
    for (const statement of source.statements) {
      if (!isImportDeclaration(statement) || !isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }
      if (!statement.moduleSpecifier.text.startsWith('obsidian-dev-utils')) {
        continue;
      }
      const names = importedNames(statement);
      wrapped.push(names.length === 0 ? statement.moduleSpecifier.text : `${statement.moduleSpecifier.text}#${names.join(',')}`);
    }

    if (wrapped.length > 0) {
      traits.set(file, wrapped.sort((a, b) => a.localeCompare(b)).join(' '));
    }
  }

  return traits;
}

/**
 * The shape of the plugin class and its settings trio.
 *
 * What a reader checks by eye when asking whether a generated project looks like a real one: which of
 * the files exist, what each one's exported class extends, and what each module exports. The base class
 * is the substance -- obsidian-dev-utils' `PluginBase` rather than Obsidian's own `Plugin` is the
 * single clearest marker that a project is on an odu preset at all.
 */
function extractPluginShape(projectDir: string): Map<string, string> {
  const traits = new Map<string, string>();

  for (const file of PLUGIN_SHAPE_FILES) {
    const source = parseSource(projectDir, file);
    if (!source) {
      continue;
    }

    const exported: string[] = [];
    for (const statement of source.statements) {
      exported.push(...exportedNames(statement));

      if (isClassDeclaration(statement) && isExported(statement)) {
        const base = baseClassName(statement);
        if (base !== null) {
          traits.set(`${file}#extends`, base);
        }
      }
    }

    traits.set(`${file}#exports`, exported.sort((a, b) => a.localeCompare(b)).join(','));
  }

  return traits;
}

function extractScripts(projectDir: string): Map<string, string> {
  const packageJsonPath = join(projectDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return new Map();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  } catch {
    return new Map();
  }

  return new Map(Object.entries((parsed as PackageJsonScripts).scripts ?? {}));
}

function importedNames(statement: ImportDeclaration): string[] {
  const clause = statement.importClause;
  if (!clause) {
    return [];
  }

  const names: string[] = [];
  if (clause.name) {
    names.push(clause.name.text);
  }

  const bindings = clause.namedBindings;
  if (bindings && isNamespaceImport(bindings)) {
    names.push(bindings.name.text);
  } else if (bindings && isNamedImports(bindings)) {
    for (const element of bindings.elements) {
      names.push(element.name.text);
    }
  }

  return names.sort((a, b) => a.localeCompare(b));
}

function isExported(statement: Statement): boolean {
  if (!canHaveModifiers(statement)) {
    return false;
  }
  return getModifiers(statement)?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword) ?? false;
}

/** A path's last segment, for matching {@link IGNORED_FILES} wherever in the tree the file sits. */
function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Parses one file, or `null` when it is absent -- absence is a trait here, not an error. */
function parseSource(projectDir: string, relativePath: string): null | SourceFile {
  const fullPath = join(projectDir, relativePath);
  if (!existsSync(fullPath)) {
    return null;
  }

  return createSourceFile(relativePath, readFileSync(fullPath, 'utf-8'), ScriptTarget.ESNext, true);
}

/** A finding without its scope -- the stable part, used for ordering the report. */
function traitKey(finding: DriftFinding): string {
  return `${finding.dimension}/${finding.kind}/${finding.key}`;
}

function walk(projectDir: string, relativeDir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(projectDir, relativeDir))) {
    if (IGNORED_DIRECTORIES.has(entry)) {
      continue;
    }
    const relativePath = relativeDir === '' ? entry : `${relativeDir}/${entry}`;
    if (statSync(join(projectDir, relativePath)).isDirectory()) {
      found.push(...walk(projectDir, relativePath));
    } else {
      found.push(relativePath);
    }
  }
  return found;
}
