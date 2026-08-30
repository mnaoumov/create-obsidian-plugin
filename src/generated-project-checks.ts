import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
 * `no-tests-collected` is separate from `step-failed` because it is the one failure a green exit code
 * hides: the runner ran, reported success, and collected nothing.
 */
export type GateViolationKind =
  | 'no-tests-collected'
  | 'step-failed';

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

  const install = run(getInstallCommand(answers.packageManager), targetDir);
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

  const compile = run('npx tsc --noEmit', targetDir);
  if (compile.ok) {
    passed.push('compile');
  } else {
    violations.push({ detail: compile.output, kind: 'step-failed', step: 'compile' });
  }

  const scripts = readScripts(targetDir);
  violations.push(...runScriptStep('build', 'build', targetDir, answers, scripts, passed, skipped));
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
