import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs';
import { join } from 'node:path';

import type { Answers } from './answers.ts';

import { getInstallCommand } from './features/package-manager/index.ts';

/** What one project's gate came to, and how long each step took. */
export interface GateResult {
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
  | 'compile'
  | 'format'
  | 'install'
  | 'lint'
  | 'styles'
  | 'test';

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
 * `no-tests-collected` and `unreadable-stylesheet` are separate from `step-failed` because they are the
 * failures a green exit code hides: the runner ran, reported success, and collected nothing; the bundler
 * ran, reported success, and wrote the stylesheet under a name Obsidian does not read.
 */
export type GateViolationKind =
  | 'no-tests-collected'
  | 'step-failed'
  | 'unreadable-stylesheet';

interface CommandResult {
  ok: boolean;
  output: string;
}

interface PackageJsonScripts {
  scripts?: Record<string, string>;
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

/** The one stylesheet name Obsidian loads. Anything else ships with the plugin and is never read. */
const STYLES_CSS = 'styles.css';

/**
 * Matches the side-effect stylesheet import in the emitted `src/main.ts`.
 *
 * Read out of the generated file rather than derived from `answers.styling`, for the reason
 * {@link runScriptStep} gives about scripts: `DEMO_OVERRIDES` forces `styling: 'scss'` on the demo
 * preset whatever was answered, so an expectation built from the raw answers calls a correct project
 * wrong. The import is the thing that makes the bundler emit CSS, so the import is the trigger.
 */
const STYLESHEET_IMPORT_PATTERN = /^import '[^']+\.(?:css|less|sass|scss)';/m;

/**
 * Matches the collected test count in either runner's summary.
 *
 * vitest prints `Tests  3 passed (3)`; jest prints `Tests:  3 passed, 3 total`. The count is the point:
 * BOTH runners exit 0 when they collect nothing at all, so a green exit code proves only that nothing
 * crashed. A suite whose file-name suffix matches no declared project reports exactly this way.
 */
const TEST_COUNT_PATTERN = /Tests:?\s+(?<Passed>\d+) passed/;

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

  const compile = run(`${execCommand(answers.packageManager)} tsc --noEmit`, targetDir);
  if (compile.ok) {
    passed.push('compile');
  } else {
    violations.push({ detail: compile.output, kind: 'step-failed', step: 'compile' });
  }

  const scripts = readScripts(targetDir);
  violations.push(...runScriptStep('build', 'build', targetDir, answers, scripts, passed, skipped));
  violations.push(...checkStyles(targetDir, passed, skipped));
  violations.push(...runScriptStep('lint', 'lint', targetDir, answers, scripts, passed, skipped));
  violations.push(...checkFormat(targetDir, answers, scripts, passed, skipped));
  violations.push(...checkTests(targetDir, answers, scripts, passed, skipped));

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

  return [{
    detail: `At or above "${AUDIT_LEVEL}":\n${audit.output}`,
    kind: 'step-failed',
    step: 'audit'
  }];
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

  if (Object.hasOwn(scripts, 'format')) {
    const format = run(runScriptCommand(answers, 'format'), targetDir);
    if (!format.ok) {
      return [{ detail: format.output, kind: 'step-failed', step: 'format' }];
    }
  }

  return runScriptStep('format', 'format:check', targetDir, answers, scripts, passed, skipped);
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

  let mainTs: string;
  try {
    mainTs = readFileSync(join(targetDir, 'src', 'main.ts'), 'utf-8');
  } catch {
    mainTs = '';
  }

  if (!STYLESHEET_IMPORT_PATTERN.test(mainTs)) {
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
    detail: `\`src/main.ts\` imports a stylesheet, so the build emits one, but ${problems.join(' ')}\n`
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

  const collected = Number(TEST_COUNT_PATTERN.exec(result.output)?.groups?.['Passed'] ?? '0');
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
