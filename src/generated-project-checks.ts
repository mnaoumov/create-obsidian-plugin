import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { builtinModules } from 'node:module';
import {
  join,
  relative,
  sep
} from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import type { Answers } from './answers.ts';

import { needsInitialFormat } from './features/formatter/index.ts';
import { INITIAL_COMMIT_MESSAGE } from './features/git-hooks.ts';
import { getInstallCommand } from './features/package-manager/index.ts';
import { UNPATCHED_ADVISORIES } from './versions.ts';

export interface CommandResult {
  ok: boolean;
  output: string;
}

/** What one project's gate came to, and how long each step took. */
export interface GateResult {
  /**
   * Why the gate could not start at all, when it could not: the case's package manager is not installed on this
   * machine. Nothing about the project was tried then, so `violations` stays empty and a report says "could not run"
   * rather than reading a missing tool as a broken case.
   */
  couldNotRun?: string;
  durationMs: number;
  /** Steps that ran and passed, for a report that can say what was actually proven. */
  passed: GateStep[];
  /** Steps not run because the answers do not emit them. */
  skipped: GateStep[];
  violations: GateViolation[];
}

/** The gate steps, in the order they run. Each one's failure means something different. */
export type GateStep =
  | 'audit'
  | 'build'
  | 'bundle'
  | 'commit'
  | 'compile'
  | 'coverage'
  | 'format'
  | 'install'
  | 'lint'
  | 'pins'
  | 'release-files'
  | 'spellcheck-after-outputs'
  | 'spellcheck'
  | 'styles'
  | 'test'
  | 'wasm';

/** One gate step's verdict on one generated project. */
export interface GateViolation {
  detail: string;
  kind: GateViolationKind;
  /** The gate step this came from, so a report can be read by step rather than by case. */
  step: GateStep;
}

/**
 * How a gate step failed.
 *
 * `no-tests-collected`, `split-bundle`, `unbundled-dependency`, `unreadable-stylesheet`, `unbundled-wasm-module` and
 * `unshipped-file` are separate from `step-failed` because they are the failures a green exit code hides: the runner ran, reported
 * success, and collected nothing; the bundler ran, reported success, and split the code across sibling
 * chunks that an Obsidian release does not ship; the bundler ran, reported success, and left a package as
 * a `require()` that nothing installs beside a plugin; the bundler ran, reported success, and wrote the
 * stylesheet under a name Obsidian does not read; the bundler ran, reported success, and left the
 * WebAssembly module in a separate file that an Obsidian release does not ship; the bundler ran, reported
 * success, and wrote something else beside the bundle that the release leaves behind.
 *
 * `committed-output` is a file the project's own steps wrote -- a coverage report, a build -- that a first
 * `git add -A` commits, because `.gitignore` does not name it.
 *
 * `stale-pin` is a pin in `pinned-versions.json` whose own check no longer prints what it expects, which
 * nothing fails on until the pin breaks an install.
 */
export type GateViolationKind =
  | 'committed-output'
  | 'no-tests-collected'
  | 'split-bundle'
  | 'stale-pin'
  | 'step-failed'
  | 'unbundled-dependency'
  | 'unbundled-wasm-module'
  | 'unreadable-stylesheet'
  | 'unshipped-file';

interface LinkinatorConfig {
  skip?: string[];
}

interface PackageJsonScripts {
  scripts?: Record<string, string>;
}

interface PinEntry {
  check?: null | string;
  expect?: null | string;
}

interface PinnedVersionsFile {
  pins?: unknown;
}

/**
 * The npm audit severity at or above which the gate fails.
 *
 * Named rather than implied. `npm audit` with no threshold fails on any advisory at any severity,
 * including ones reachable only through a dev-only transitive path that no published plugin ships -- so
 * a gate with no threshold goes red permanently on noise and stops being read. The repo already carries
 * `ADVISORY_OVERRIDES` for the advisories that are worth clearing.
 */
const AUDIT_LEVEL = 'high';

/** An advisory as `npm audit --json` lists it in a package's `via`. */
interface AuditAdvisory {
  severity?: string;
  url?: string;
}

/** The part of an `npm audit --json` report the gate reads. */
interface AuditReport {
  vulnerabilities?: Record<string, AuditVulnerability>;
}

/** One package in an `npm audit --json` report: an advisory object, or the name of the package it came through. */
interface AuditVulnerability {
  via?: (AuditAdvisory | string)[];
}

/** The severities at or above {@link AUDIT_LEVEL}. */
const BLOCKING_SEVERITIES = new Set(['critical', 'high']);

/**
 * Returns the advisories in an `npm audit --json` report that fail the gate.
 *
 * npm marks every package between an advisory and the project with the advisory's severity, so the
 * report's counts say nothing about how many advisories there are. The advisories themselves are the
 * objects in each package's `via`: one at or above {@link AUDIT_LEVEL} whose GHSA id is not in
 * `accepted` blocks. Each is named by its GHSA id, or by its URL when the id cannot be read off it.
 */
export function findBlockingAdvisories(report: unknown, accepted: ReadonlySet<string>): string[] {
  const vulnerabilities = (report as AuditReport).vulnerabilities ?? {};
  const blocking = new Set<string>();
  for (const vulnerability of Object.values(vulnerabilities)) {
    for (const advisory of vulnerability.via ?? []) {
      // A string names the package the advisory came through, which has its own entry.
      if (typeof advisory === 'string') {
        continue;
      }
      if (!BLOCKING_SEVERITIES.has(advisory.severity ?? '')) {
        continue;
      }
      const url = advisory.url ?? '';
      const id = /GHSA-[\w-]+$/.exec(url)?.[0] ?? url;
      if (!accepted.has(id)) {
        blocking.add(id);
      }
    }
  }
  return [...blocking].sort();
}

/** How much of a failing step's output to keep. Enough to diagnose, short enough to print per case. */
const OUTPUT_LIMIT = 4000;

const COMMAND_TIMEOUT_MS = 900_000;

/**
 * Where a production build lands, for every preset and every bundler this generator emits.
 *
 * Written with a forward slash rather than through `join`, because it is also printed: `join` yields
 * `dist\build` on Windows, and a violation naming `dist\build/styles.css` reads as a harness bug.
 * `join(targetDir, BUILD_DIST_FOLDER)` normalizes it for the filesystem either way.
 */
const BUILD_DIST_FOLDER = 'dist/build';

/** What the gate's own steps write into the project, none of which belongs in its first commit. */
const COMMITTED_OUTPUT_FOLDERS: readonly string[] = ['coverage', 'dist', 'node_modules'];

const LINKINATOR_CONFIG_FILE = 'linkinator.config.json';

const JSON_INDENT_SPACES = 2;

/** The one script Obsidian loads. Any other `.js` beside it ships with no release and is never read. */
const MAIN_JS = 'main.js';

/** The one stylesheet name Obsidian loads. Anything else ships with the plugin and is never read. */
const STYLES_CSS = 'styles.css';

/** Everything an Obsidian release carries. A file anywhere else in the build output is left behind. */
const RELEASE_FILES: ReadonlySet<string> = new Set([MAIN_JS, 'manifest.json', STYLES_CSS]);

/** Output files that another gate step already owns, so the release-files step does not report them twice. */
const OWNED_BY_ANOTHER_STEP_PATTERN = /\.(?:[cm]?js|css|wasm)$/;

/**
 * The sample WebAssembly module, and so the trigger for the WASM step.
 *
 * Read off the emitted tree rather than from `answers.wasmSupport`, for the reason {@link checkStyles}
 * gives about the stylesheet: what the project actually contains is the thing being checked.
 */
const WASM_MODULE_PATH = 'src/wasm/module.wasm';

/**
 * Matches a stylesheet import in an emitted `src/` module: the side-effect form `src/main.ts` uses, or a
 * CSS module's class names bound to a default import, which is how the css-modules sample reaches its
 * stylesheet. A bare import of a CSS module is not enough under vite, which drops it with its CSS.
 *
 * Read out of the generated files rather than derived from `answers.styling`, for the reason
 * {@link runScriptStep} gives about scripts: `DEMO_OVERRIDES` forces `styling: 'scss'` on the demo
 * preset whatever was answered, so an expectation built from the raw answers calls a correct project
 * wrong. The import is the thing that makes the bundler emit CSS, so the import is the trigger.
 */
const STYLESHEET_IMPORT_PATTERN = /^import (?:\w+ from )?'[^']+\.(?:css|less|sass|scss)';/m;

/**
 * Upstream's code blocks, which the docs-showcase preset copies verbatim. Not the project's own
 * stylesheet imports, so the `styles` trigger does not read them.
 */
const DOCS_SHOWCASE_FOLDER = join('src', 'docs');

/**
 * Matches a `require()` of a string literal in the bundle, capturing the specifier.
 *
 * A computed `require(name)` is not matched: no bundler leaves one for a module it was asked to bundle,
 * and a dependency that builds one itself is beyond what a text scan can judge. Neither is a specifier
 * holding `${`, which is code a dependency GENERATES rather than runs: Vue's compiler writes
 * `require("${l}")` into a template string.
 */
const REQUIRE_PATTERN = /\brequire\((?<Quote>["'])(?<Specifier>(?:(?!\$\{)[^"'])+)\k<Quote>\)/g;

/** The packages Obsidian supplies at runtime, and so the only ones a plugin may leave to `require()`. */
const OBSIDIAN_SUPPLIED_PACKAGES: ReadonlySet<string> = new Set(['electron', 'obsidian']);

/** How many `/`-separated segments a scoped package name has: `@scope/name`. */
const SCOPED_PACKAGE_NAME_SEGMENTS = 2;

/** The package scopes Obsidian supplies at runtime: the CodeMirror 6 its editor runs on. */
const OBSIDIAN_SUPPLIED_SCOPES: readonly string[] = ['@codemirror/', '@lezer/'];

/** A JavaScript file in any of the module flavours a bundler may be told to write. */
const SCRIPT_FILE_PATTERN = /\.[cm]?js$/;

/**
 * Matches the `Tests` totals line of either runner's summary, and not its `Test Files` / `Test Suites` line.
 *
 * vitest prints `Tests  3 passed (3)`; jest prints `Tests:  3 passed, 3 total`. The count is the point:
 * BOTH runners exit 0 when they collect nothing at all, so a green exit code proves only that nothing
 * crashed. A suite whose file-name suffix matches no declared project reports exactly this way.
 *
 * The totals line is what BOTH vitest reporters print. Vitest picks its `minimal` reporter when it runs
 * under an AI coding session, and that one prints no per-file line for a passing file, so a parse of
 * anything but the totals would read differently depending on who ran the gate.
 */
const TESTS_LINE_PATTERN = /^\s*Tests:?\s(?<Totals>.*)$/m;

/** Matches the passed count within the totals, which may follow a failed or skipped count. */
const PASSED_COUNT_PATTERN = /(?<Passed>\d+) passed/;

/**
 * Lists the pins in a `pinned-versions.json` whose condition no longer holds.
 *
 * Each entry with a `check` names a command whose trimmed stdout equals `expect` exactly while the pin is
 * still needed, so any other output means the pin has gone stale: follow it to the new range, or drop it.
 * A check that cannot run is reported too, because a check nobody can run never retires its pin.
 *
 * The entries sit under the file's `pins` key, beside its `comment`. Walking the top level instead read
 * those two keys as entries with no `check`, so every pin was skipped and the step passed on a stale pin.
 * A file with no `pins` object is therefore an error rather than an empty list.
 *
 * @param pinnedVersionsJson - The file's text, as `buildPinnedVersionsJson` writes it.
 * @param runCheck - Runs one check command and returns its result.
 * @returns One line per stale or unrunnable pin.
 */
export function findStalePins(pinnedVersionsJson: string, runCheck: (command: string) => CommandResult): string[] {
  const { pins } = JSON.parse(pinnedVersionsJson) as PinnedVersionsFile;
  if (typeof pins !== 'object' || pins === null) {
    throw new Error('pinned-versions.json has no "pins" object');
  }
  const stale: string[] = [];
  for (const [packageName, value] of Object.entries(pins)) {
    if (typeof value !== 'object' || value === null) {
      continue;
    }
    const pin = value as PinEntry;
    if (!pin.check || pin.expect === null || pin.expect === undefined) {
      continue;
    }
    const result = runCheck(pin.check);
    if (!result.ok) {
      stale.push(`${packageName}: the check failed to run: ${result.output}`);
    } else if (result.output !== pin.expect) {
      stale.push(`${packageName}: the check printed "${result.output}", the pin expects "${pin.expect}"`);
    }
  }
  return stale;
}

/**
 * Names the modules a bundle `require()`s that neither Obsidian nor Node supplies at runtime.
 *
 * An Obsidian plugin is installed as `main.js` alone, with no `node_modules` beside it, so every package
 * other than the app's own has to be inside the bundle. A bundler told to target node may leave them all
 * external -- Parcel did, for every dependency -- and the build exits 0 with a `main.js` that throws on
 * load. A Node builtin passes with or without the `node:` prefix, and so does a subpath of one
 * (`fs/promises`); a subpath of a package is judged by its package.
 */
export function findUnbundledRequires(bundle: string): string[] {
  const builtins = new Set(builtinModules);
  const found = new Set<string>();
  for (const match of bundle.matchAll(REQUIRE_PATTERN)) {
    const specifier = match.groups?.['Specifier'] ?? '';
    const packageName = specifier.startsWith('@') ? specifier.split('/').slice(0, SCOPED_PACKAGE_NAME_SEGMENTS).join('/') : specifier.split('/')[0] ?? '';
    const isSupplied = specifier.startsWith('.')
      || specifier.startsWith('node:')
      || builtins.has(packageName)
      || OBSIDIAN_SUPPLIED_PACKAGES.has(packageName)
      || OBSIDIAN_SUPPLIED_SCOPES.some((scope) => specifier.startsWith(scope));
    if (!isSupplied) {
      found.add(specifier);
    }
  }
  return [...found].sort();
}

/**
 * Names the files in a production build folder that an Obsidian release leaves behind.
 *
 * Scripts, stylesheets and `.wasm` modules are left out: the `bundle`, `styles` and `wasm` steps each
 * report their own kind of stray file, with a detail that says what went wrong, and the same file named
 * again here would only repeat it.
 */
export function findUnshippedFiles(fileNames: readonly string[]): string[] {
  return fileNames.filter((name) => !RELEASE_FILES.has(name) && !OWNED_BY_ANOTHER_STEP_PATTERN.test(name));
}

/**
 * Reads how many tests passed out of a test runner's output, or 0 when no count can be found.
 *
 * Both runners color their summary, and the escapes sit between the label and the count
 * (`ESC[2m      Tests ESC[22m ESC[1mESC[32m1 passed`), so they are stripped before anything is matched.
 * A count that cannot be found reads as 0, which fails the step: when a runner changes its format again,
 * the gate goes red rather than quietly passing a suite nothing is known to have run.
 */
export function readCollectedTestCount(output: string): number {
  const totals = TESTS_LINE_PATTERN.exec(stripVTControlCharacters(output))?.groups?.['Totals'] ?? '';
  return Number(PASSED_COUNT_PATTERN.exec(totals)?.groups?.['Passed'] ?? '0');
}

/**
 * Installs a generated project and runs every gate its answers actually emit.
 *
 * Ordered so that a failure stops the steps that could not have succeeded anyway: nothing can compile
 * before it installs, and nothing can be linted before it compiles.
 */
export function runGate(targetDir: string, answers: Answers): GateResult {
  const started = Date.now();
  const violations: GateViolation[] = [];
  const passed: GateStep[] = [];
  const skipped: GateStep[] = [];

  // Probed first because a missing manager otherwise fails `install` with a bare `bun: not found`, which reads as the
  // Case being broken. That is how the docs-showcase sync PR reported a runner that simply had no bun.
  if (!run(`${answers.packageManager} --version`, targetDir).ok) {
    return {
      couldNotRun: `${answers.packageManager} not installed`,
      durationMs: Date.now() - started,
      passed,
      skipped,
      violations
    };
  }

  const install = run(installCommand(answers.packageManager), targetDir);
  if (!install.ok) {
    violations.push({ detail: install.output, kind: 'step-failed', step: 'install' });
    return {
      durationMs: Date.now() - started,
      passed,
      skipped,
      violations
    };
  }
  passed.push('install');

  violations.push(...checkAudit(targetDir, answers, skipped, passed));
  violations.push(...checkPins(targetDir, answers, skipped, passed));

  const compile = run(`${execCommand(answers.packageManager)} tsc --noEmit`, targetDir);
  if (compile.ok) {
    passed.push('compile');
  } else {
    violations.push({ detail: compile.output, kind: 'step-failed', step: 'compile' });
  }

  const scripts = readScripts(targetDir);
  violations.push(...runScriptStep('build', 'build', targetDir, answers, scripts, passed, skipped));
  violations.push(...checkBundle(targetDir, passed, skipped));
  violations.push(...checkStyles(targetDir, passed, skipped));
  violations.push(...checkWasm(targetDir, passed, skipped));
  violations.push(...checkReleaseFiles(targetDir, passed, skipped));
  violations.push(...runScriptStep('lint', 'lint', targetDir, answers, scripts, passed, skipped));
  // The emitted `gate` and `version` scripts both run spellcheck first, so a word the scaffold writes and
  // Its own `cspell.json` does not know leaves a fresh project red on its own release preflight.
  violations.push(...runScriptStep('spellcheck', 'spellcheck', targetDir, answers, scripts, passed, skipped));
  violations.push(...checkFormat(targetDir, answers, scripts, passed, skipped));
  violations.push(...checkTests(targetDir, answers, scripts, passed, skipped));
  violations.push(...runScriptStep('coverage', 'test:coverage', targetDir, answers, scripts, passed, skipped));
  // The first spellcheck ran before anything wrote a report, so it cannot see one that `cspell.json` does not
  // Ignore. A coverage report left the gate green and the next `spellcheck` red on about 80 words.
  violations.push(...runScriptStep('spellcheck-after-outputs', 'spellcheck', targetDir, answers, scripts, passed, skipped));
  violations.push(...checkCommit(targetDir, answers, scripts, passed));

  return {
    durationMs: Date.now() - started,
    passed,
    skipped,
    violations
  };
}

/**
 * Runs `npm audit` against a stated severity threshold.
 *
 * Only under npm: `yarn audit`, `pnpm audit` and `bun audit` report different shapes and severities, and
 * the advisory set is a property of the dependency tree rather than of the installer, so running it once
 * under npm says what there is to say.
 */
function checkAudit(targetDir: string, answers: Answers, skipped: GateStep[], passed: GateStep[]): GateViolation[] {
  if (answers.packageManager !== 'npm') {
    skipped.push('audit');
    return [];
  }

  const audit = run(`npm audit --audit-level=${AUDIT_LEVEL}`, targetDir);
  if (audit.ok) {
    passed.push('audit');
    return [];
  }

  // The text report is truncated for printing, so the decision reads the JSON one, which is not.
  const json = spawnSync('npm audit --json', { cwd: targetDir, encoding: 'utf-8', shell: true, timeout: COMMAND_TIMEOUT_MS });
  let blocking: null | string[] = null;
  try {
    blocking = findBlockingAdvisories(JSON.parse(json.stdout), new Set(Object.keys(UNPATCHED_ADVISORIES)));
  } catch {
    // An unreadable JSON report leaves the text report's failure standing.
  }

  if (blocking?.length === 0) {
    passed.push('audit');
    return [];
  }

  return [{
    detail: `At or above "${AUDIT_LEVEL}"${blocking ? ` (${blocking.join(', ')})` : ''}:\n${audit.output}`,
    kind: 'step-failed',
    step: 'audit'
  }];
}

/**
 * Insists that the build is ONE script, `main.js`.
 *
 * The {@link checkStyles} twin, for the JavaScript. An Obsidian release ships `main.js`, `manifest.json`
 * and `styles.css` and nothing else, and the app loads the plugin from `main.js` alone. A bundler that
 * code-splits writes sibling chunks that `main.js` then resolves by name at runtime -- webpack's runtime
 * carries `e => e + ".main.js"` -- so every code path reaching one of them fails once the plugin is
 * installed, in a build that exited 0.
 *
 * Two things are asserted: `main.js` exists, and it is the ONLY script in the folder. The second clause
 * is the whole check, exactly as the "only css" clause is in {@link checkStyles}.
 */
function checkBundle(targetDir: string, passed: GateStep[], skipped: GateStep[]): GateViolation[] {
  if (!passed.includes('build')) {
    skipped.push('bundle');
    return [];
  }

  const distFolder = join(targetDir, BUILD_DIST_FOLDER);
  let emitted: string[];
  try {
    emitted = readdirSync(distFolder, { withFileTypes: true })
      .filter((entry) => entry.isFile() && SCRIPT_FILE_PATTERN.test(entry.name))
      .map((entry) => entry.name);
  } catch {
    emitted = [];
  }

  const problems: string[] = [];

  if (!emitted.includes(MAIN_JS)) {
    problems.push(`\`${BUILD_DIST_FOLDER}/${MAIN_JS}\` does not exist.`);
  }

  const stray = emitted.filter((name) => name !== MAIN_JS);
  if (stray.length > 0) {
    problems.push(`${stray.map((name) => `\`${name}\``).join(', ')} ships beside \`${MAIN_JS}\`, and an Obsidian release does not carry it.`);
  }

  const unbundled = emitted.includes(MAIN_JS) ? findUnbundledRequires(readFileSync(join(distFolder, MAIN_JS), 'utf-8')) : [];

  if (problems.length === 0 && unbundled.length === 0) {
    passed.push('bundle');
    return [];
  }

  const violations: GateViolation[] = [];
  if (unbundled.length > 0) {
    violations.push({
      detail: `\`${BUILD_DIST_FOLDER}/${MAIN_JS}\` requires ${unbundled.map((name) => `\`${name}\``).join(', ')} at runtime, and nothing `
        + 'installs a package beside an Obsidian plugin: the bundler left it external instead of bundling it.',
      kind: 'unbundled-dependency',
      step: 'bundle'
    });
  }
  if (problems.length === 0) {
    return violations;
  }

  return [...violations, {
    detail: `An Obsidian plugin is one script, but ${problems.join(' ')}\n`
      + `Scripts in \`${BUILD_DIST_FOLDER}\`: ${emitted.length > 0 ? emitted.join(', ') : '(none)'}`,
    kind: 'split-bundle',
    step: 'bundle'
  }];
}

/**
 * Takes the project's first commit the way the interactive scaffold does (`runPostScaffold`, `src/main.ts`):
 * `git init`, the `prepare` script that installs the hooks, `git add -A`, `git commit` with the same message.
 *
 * Last, so the tree holds everything the other steps wrote. Two failures only show here. The pre-commit hook hands
 * its tools the staged paths, dotfiles included, where the project-wide scripts skip them, so a word in
 * `.create-obsidian-plugin.json` failed the hook's cspell while `spellcheck` passed. And `committed-output` is an
 * output `.gitignore` does not name, which the commit takes in.
 */
function checkCommit(targetDir: string, answers: Answers, scripts: Readonly<Record<string, string>>, passed: GateStep[]): GateViolation[] {
  skipAuthorProfileLink(targetDir, answers);
  const commands = [
    `git init -b ${answers.defaultBranch}`,
    ...(Object.hasOwn(scripts, 'prepare') ? [runScriptCommand(answers, 'prepare')] : []),
    'git add -A',
    `git -c user.name=create-obsidian-plugin -c user.email=gate@create-obsidian-plugin.invalid commit -m "${INITIAL_COMMIT_MESSAGE}"`
  ];
  for (const command of commands) {
    const result = run(command, targetDir);
    if (!result.ok) {
      return [{ detail: `${command}\n${result.output}`, kind: 'step-failed', step: 'commit' }];
    }
  }

  const committedOutputs = run(`git ls-files -- ${COMMITTED_OUTPUT_FOLDERS.join(' ')}`, targetDir).output;
  if (committedOutputs) {
    return [{
      detail: `The first commit took in files the project's own steps wrote, which .gitignore does not name:\n${committedOutputs}`,
      kind: 'committed-output',
      step: 'commit'
    }];
  }

  passed.push('commit');
  return [];
}

/**
 * Formats, then checks the formatting -- in that order, because that is what a real generation does.
 *
 * `runInitialFormat` (`src/main.ts`) runs the chosen formatter after install and before the first
 * commit, precisely because the templates are authored in one style and prettier and biome cannot be
 * configured to reproduce it. Checking without formatting first would therefore report every
 * prettier and biome project as failing its own `format:check`, which is a fact about this harness
 * rather than about the templates. Running both still proves what matters: that the formatter is
 * configured well enough to run, and that its output is stable under its own check.
 */
function checkFormat(targetDir: string, answers: Answers, scripts: Readonly<Record<string, string>>, passed: GateStep[], skipped: GateStep[]): GateViolation[] {
  if (!Object.hasOwn(scripts, 'format:check')) {
    skipped.push('format');
    return [];
  }

  // Only the formatters `needsInitialFormat` names get the formatting pass: an interactive run gives it to
  // An installed project, and a `--yes` run's `Next steps` tell the user to run it. Formatting first under
  // Dprint too hid a template it rejects -- and a `--yes` project failed its own `format:check` on day one.
  if (needsInitialFormat(answers.formatter) && Object.hasOwn(scripts, 'format')) {
    const format = run(runScriptCommand(answers, 'format'), targetDir);
    if (!format.ok) {
      return [{ detail: format.output, kind: 'step-failed', step: 'format' }];
    }
  }

  return runScriptStep('format', 'format:check', targetDir, answers, scripts, passed, skipped);
}

/**
 * Re-runs every check in the emitted `pinned-versions.json` against the installed tree.
 *
 * Nothing else ever runs them: the file exists for a person's dependency sweep, so a pin whose condition had
 * already gone stayed in the generator, and the first sign was an `npm install` failing on ERESOLVE in every
 * fresh project. Only under npm, for the reason {@link checkAudit} gives, and because pnpm does not hoist the
 * nested packages several checks read off disk.
 */
function checkPins(targetDir: string, answers: Answers, skipped: GateStep[], passed: GateStep[]): GateViolation[] {
  const pinsPath = join(targetDir, 'pinned-versions.json');
  if (answers.packageManager !== 'npm' || !existsSync(pinsPath)) {
    skipped.push('pins');
    return [];
  }

  const stale = findStalePins(readFileSync(pinsPath, 'utf-8'), (command) => {
    const result = run(command, targetDir);
    return { ok: result.ok, output: result.output.trim() };
  });
  if (stale.length === 0) {
    passed.push('pins');
    return [];
  }

  return [{ detail: stale.join('\n'), kind: 'stale-pin', step: 'pins' }];
}

/**
 * Insists that the build folder holds nothing an Obsidian release leaves behind.
 *
 * The catch-all beside {@link checkBundle}, {@link checkStyles} and {@link checkWasm}, each of which knows
 * one kind of stray file. What showed the need for it is webpack's terser, which by default cuts the
 * bundled dependencies' license comments out of `main.js` into a `main.js.LICENSE.txt` beside it. Nothing
 * loads that file, so the plugin runs; it just ships without the notices its dependencies are licensed
 * under, in a build that exited 0.
 */
function checkReleaseFiles(targetDir: string, passed: GateStep[], skipped: GateStep[]): GateViolation[] {
  if (!passed.includes('build')) {
    skipped.push('release-files');
    return [];
  }

  let emitted: string[];
  try {
    emitted = readdirSync(join(targetDir, BUILD_DIST_FOLDER), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    emitted = [];
  }

  const unshipped = findUnshippedFiles(emitted);
  if (unshipped.length === 0) {
    passed.push('release-files');
    return [];
  }

  return [{
    detail: `${unshipped.map((name) => `\`${name}\``).join(', ')} ships beside \`${MAIN_JS}\`, and an Obsidian release `
      + `carries only ${[...RELEASE_FILES].map((name) => `\`${name}\``).join(', ')}.\n`
      + `Files in \`${BUILD_DIST_FOLDER}\`: ${emitted.join(', ')}`,
    kind: 'unshipped-file',
    step: 'release-files'
  }];
}

/**
 * Insists that a project which imports a stylesheet ships one Obsidian will actually read.
 *
 * The `build` step above proves only that the bundler exited 0. Obsidian loads a plugin's stylesheet
 * from `styles.css` and nothing else, and half the bundler paths named it something else while
 * building perfectly: standalone esbuild wrote `main.css` (the CSS lands beside `outfile`), vite named
 * it after the package, and parcel content-hashed it as a sibling bundle. Each of those ships a
 * stylesheet with every release that the app never opens, and no exit code says so.
 *
 * Three things are asserted, because each fails silently on its own: the file exists, it is not empty
 * (an empty `styles.css` is exactly as inert), and it is the ONLY css in the folder -- which is what
 * catches a half-fix that writes `styles.css` and leaves the misnamed original beside it.
 */
function checkStyles(targetDir: string, passed: GateStep[], skipped: GateStep[]): GateViolation[] {
  if (!passed.includes('build')) {
    skipped.push('styles');
    return [];
  }

  const importingModule = findStylesheetImportingModule(targetDir);
  if (importingModule === undefined) {
    skipped.push('styles');
    return [];
  }

  const distFolder = join(targetDir, BUILD_DIST_FOLDER);
  let emitted: string[];
  try {
    emitted = readdirSync(distFolder, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
      .map((entry) => entry.name);
  } catch {
    emitted = [];
  }

  const stylesPath = join(distFolder, STYLES_CSS);
  const problems: string[] = [];

  if (!existsSync(stylesPath)) {
    problems.push(`\`${BUILD_DIST_FOLDER}/${STYLES_CSS}\` does not exist.`);
  } else if (statSync(stylesPath).size === 0) {
    problems.push(`\`${BUILD_DIST_FOLDER}/${STYLES_CSS}\` is empty.`);
  }

  const stray = emitted.filter((name) => name !== STYLES_CSS);
  if (stray.length > 0) {
    problems.push(`Obsidian will not read ${stray.map((name) => `\`${name}\``).join(', ')}.`);
  }

  if (problems.length === 0) {
    passed.push('styles');
    return [];
  }

  return [{
    detail: `\`${importingModule}\` imports a stylesheet, so the build emits one, but ${problems.join(' ')}\n`
      + `CSS in \`${BUILD_DIST_FOLDER}\`: ${emitted.length > 0 ? emitted.join(', ') : '(none)'}`,
    kind: 'unreadable-stylesheet',
    step: 'styles'
  }];
}

/**
 * Runs the test script and insists on a non-zero collected test count.
 *
 * The exit code alone is not evidence: jest and vitest both exit 0 having collected nothing, so a test
 * script pointed at a suffix no project declares reports success while running nothing at all.
 */
function checkTests(targetDir: string, answers: Answers, scripts: Readonly<Record<string, string>>, passed: GateStep[], skipped: GateStep[]): GateViolation[] {
  if (!Object.hasOwn(scripts, 'test')) {
    skipped.push('test');
    return [];
  }

  const result = run(runScriptCommand(answers, 'test'), targetDir);
  if (!result.ok) {
    return [{ detail: result.output, kind: 'step-failed', step: 'test' }];
  }

  const collected = readCollectedTestCount(result.output);
  if (collected === 0) {
    return [{
      detail: `The test script exited 0 but no collected test count could be read from its output, so nothing is known to have run.\n${result.output}`,
      kind: 'no-tests-collected',
      step: 'test'
    }];
  }

  passed.push('test');
  return [];
}

/**
 * Insists that the WebAssembly module ended up INSIDE `main.js`.
 *
 * The same class of failure as {@link checkStyles}, and worse hidden. Obsidian installs a plugin from
 * `main.js`, `styles.css` and `manifest.json` -- nothing else in the release archive is read -- so a
 * bundler that emits the module as a separate `.wasm` beside the bundle produces a plugin that works in
 * the repo and is broken everywhere it is installed. Three of the five bundlers did exactly that by
 * default: esbuild's ESM-integration plugin in its `deferred` mode, webpack's
 * `experiments.asyncWebAssembly`, and parcel's native `.wasm` resolution. `npm run build` exits 0 for
 * every one of them.
 *
 * Both halves are needed. A stray `.wasm` in the output folder is the positive signature of the failure;
 * finding the module's bytes in `main.js` is the positive signature of the fix, and without it a bundler
 * that silently dropped the import altogether -- tree-shaking an unused export -- would pass on the
 * first clause alone.
 *
 * The encodings are derived from the emitted module rather than hardcoded, so replacing the sample does
 * not silently disable the check. Four are known, because that is what the five bundlers produce:
 * base64 (esbuild's `binary` loader, `@rollup/plugin-wasm`, and vite's and webpack's `data:` URLs),
 * percent-encoded base64 (parcel's `data:` URL), a decimal byte list, and the raw bytes. A fifth
 * encoding fails here, which is the right outcome -- it means a bundler changed what it emits and
 * somebody should look at it.
 */
function checkWasm(targetDir: string, passed: GateStep[], skipped: GateStep[]): GateViolation[] {
  const modulePath = join(targetDir, WASM_MODULE_PATH);
  if (!passed.includes('build') || !existsSync(modulePath)) {
    skipped.push('wasm');
    return [];
  }

  const moduleBytes = readFileSync(modulePath);
  const distFolder = join(targetDir, BUILD_DIST_FOLDER);

  let emitted: string[];
  try {
    emitted = readdirSync(distFolder, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    emitted = [];
  }

  let bundle = Buffer.alloc(0);
  try {
    bundle = readFileSync(join(distFolder, 'main.js'));
  } catch {
    // Left empty: the "not in the bundle" problem below says it better than a read error would.
  }

  const problems: string[] = [];

  const stray = emitted.filter((name) => name.endsWith('.wasm'));
  if (stray.length > 0) {
    problems.push(`${stray.map((name) => `\`${name}\``).join(', ')} ships beside \`main.js\`, and an Obsidian release does not carry it.`);
  }

  // `latin1` so the search never fails on a byte sequence that is not valid UTF-8; the two textual
  // Encodings are ASCII, so they match under it unchanged.
  const bundleText = bundle.toString('latin1');
  const base64 = moduleBytes.toString('base64');
  const inBundle = bundleText.includes(base64)
    // Parcel percent-encodes the payload of its `data-url:` output, so the same base64 reaches the
    // Bundle with every `/` written `%2F`. Known here as its own encoding rather than by decoding
    // The whole bundle, which would be a much larger claim about a much larger string.
    || bundleText.includes(encodeURIComponent(base64))
    || bundleText.includes([...moduleBytes].join(','))
    || bundle.includes(moduleBytes);

  if (!inBundle) {
    problems.push(`\`${BUILD_DIST_FOLDER}/main.js\` does not contain the module in any encoding this check knows.`);
  }

  if (problems.length === 0) {
    passed.push('wasm');
    return [];
  }

  return [{
    detail: `\`${WASM_MODULE_PATH}\` is imported by \`src/wasm/answer.ts\`, so the build must inline it, but ${problems.join(' ')}\n`
      + `Files in \`${BUILD_DIST_FOLDER}\`: ${emitted.length > 0 ? emitted.join(', ') : '(none)'}`,
    kind: 'unbundled-wasm-module',
    step: 'wasm'
  }];
}

/**
 * How to run a binary out of the project's own `node_modules`, per package manager.
 *
 * Not always `npx`. On Windows, `bun install` writes `tsc.bunx` and `tsc.exe` into `node_modules/.bin`
 * and NOT the `tsc.cmd` npm's `npx` looks for, so `npx tsc` misses the local install and fetches from
 * the registry instead -- which for `tsc` means the decoy package, whose entire output is "This is not
 * the tsc command you are looking for". The project itself was fine: `bun x tsc --noEmit` and the
 * binary called directly both type-check it clean. Gating a project with a command its own package
 * manager would never issue tests the harness, not the project.
 */
function execCommand(packageManager: string): string {
  // Bun is the only exception. npm, pnpm and yarn all write npm-compatible `.cmd` shims, and `npx tsc`
  // Was measured working under each; `yarn exec` is the one that does NOT work (yarn 1 answers
  // "Couldn't find the binary tsc"), so reaching for every manager's own exec subcommand would trade
  // One broken case for another.
  return packageManager === 'bun' ? 'bun x' : 'npx';
}

/**
 * The first emitted `src/` TypeScript module that imports a stylesheet, as a `/`-separated path, or
 * `undefined` when none does. `src/main.ts` is read first, since that is where every styling answer but
 * css-modules imports its stylesheet.
 */
function findStylesheetImportingModule(targetDir: string): string | undefined {
  let modules: string[];
  try {
    modules = readdirSync(join(targetDir, 'src'), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
      .map((entry) => relative(targetDir, join(entry.parentPath, entry.name)))
      .filter((path) => !path.startsWith(DOCS_SHOWCASE_FOLDER + sep));
  } catch {
    return undefined;
  }

  const mainTs = join('src', 'main.ts');
  modules.sort((a, b) => Number(b === mainTs) - Number(a === mainTs));
  const found = modules.find((path) => STYLESHEET_IMPORT_PATTERN.test(readFileSync(join(targetDir, path), 'utf-8')));
  return found?.replaceAll('\\', '/');
}

/**
 * The install command, with the one policy this tier has to opt out of.
 *
 * pnpm 12 refuses a lockfile containing anything published within `minimumReleaseAge` (a day by
 * default) -- `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`. This tier resolves every package to the
 * registry's current `latest` ON PURPOSE, so any day a dependency cut a release, the pnpm case fails on
 * a supply-chain policy rather than on anything about the generated project. Turning it off HERE, in
 * the harness, and not in the emitted `pnpm-workspace.yaml`, is the point: a real project should keep
 * the protection, and does.
 */
function installCommand(packageManager: string): string {
  const command = getInstallCommand(packageManager);
  return packageManager === 'pnpm' ? `${command} --config.minimumReleaseAge=0` : command;
}

function readScripts(targetDir: string): Record<string, string> {
  try {
    return (JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8')) as PackageJsonScripts).scripts ?? {};
  } catch {
    return {};
  }
}

function run(command: string, cwd: string): CommandResult {
  const result = spawnSync(command, {
    cwd,
    encoding: 'utf-8',
    shell: true,
    timeout: COMMAND_TIMEOUT_MS
  });

  // The spawn error matters as much as the streams: a command that never started leaves both empty and
  // A null status, which would otherwise be reported as a failure with no explanation at all.
  const output = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('').trim();
  return {
    ok: result.status === 0,
    output: output.length > OUTPUT_LIMIT ? `${output.slice(0, OUTPUT_LIMIT)}\n... (truncated)` : output
  };
}

function runScriptCommand(answers: Answers, scriptName: string): string {
  return answers.packageManager === 'npm' ? `npm run ${scriptName}` : `${answers.packageManager} run ${scriptName}`;
}

/**
 * Runs one script-backed step, recording a skip when the project has no such script.
 *
 * Which scripts SHOULD exist is deliberately not decided here. `linter: 'none'` and `formatter: 'none'`
 * are legal, but so is the demo preset overriding them -- `DEMO_OVERRIDES` forces eslint on regardless
 * of the linter answer, so an expectation derived from the raw answers reports the demo preset as
 * wrong when it is behaving exactly as designed. The plan tier already checks the plan against the
 * answers and the render tier checks the emitted scripts against the plan; this tier runs what is
 * there.
 */
function runScriptStep(
  step: GateStep,
  scriptName: string,
  targetDir: string,
  answers: Answers,
  scripts: Readonly<Record<string, string>>,
  passed: GateStep[],
  skipped: GateStep[]
): GateViolation[] {
  if (!Object.hasOwn(scripts, scriptName)) {
    skipped.push(step);
    return [];
  }

  const result = run(runScriptCommand(answers, scriptName), targetDir);
  if (!result.ok) {
    return [{ detail: result.output, kind: 'step-failed', step }];
  }

  passed.push(step);
  return [];
}

/**
 * Tells linkinator to skip the author's GitHub profile, which the pre-commit hook's `lint:md:fix` checks.
 *
 * The harness's own opt-out, like pnpm's `minimumReleaseAge` in {@link installCommand}: the fixture author `testuser`
 * has no profile, so the link 404s for a reason that is about the fixture, not the project. A real author's profile
 * stays checked in a real project, because it is what catches a mistyped GitHub name.
 */
function skipAuthorProfileLink(targetDir: string, answers: Answers): void {
  const configPath = join(targetDir, LINKINATOR_CONFIG_FILE);
  if (!existsSync(configPath)) {
    return;
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8')) as LinkinatorConfig;
  config.skip = [...config.skip ?? [], `^https://github\\.com/${answers.authorGitHubName}/?$`];
  writeFileSync(configPath, `${JSON.stringify(config, null, JSON_INDENT_SPACES)}\n`);
}
