import { spawn } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import {
  availableParallelism,
  tmpdir
} from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import type { Answers } from '../src/answers.ts';
import type { GateResult } from '../src/generated-project-checks.ts';

import {
  ANSWER_SPACE,
  ANSWER_SPACE_DIMENSION_SIZES,
  answersFromValueIndices,
  describeCase,
  findDimension,
  makeAnswers
} from '../src/answer-space.ts';
import { buildCoveringArray } from '../src/covering-array.ts';
import { runGate } from '../src/generated-project-checks.ts';
import {
  buildTemplate,
  copyTemplates
} from '../src/templates.ts';
import {
  fetchLatestObsidianVersion,
  resolveVersions
} from '../src/versions.ts';

/**
 * The package manager the matrix runs under.
 *
 * Pulled OUT of the matrix rather than crossed with it, for the reason next.js gives for the same
 * decision in its own generator matrix: the package manager does not change whether the project builds.
 * The other three still get one end-to-end case each ({@link SMOKE_PACKAGE_MANAGERS}), so a broken
 * install or run command is caught -- crossing them would multiply an already hour-long tier by four to
 * learn the same thing.
 */
const MATRIX_PACKAGE_MANAGER = 'npm';

/** Package managers that get one full end-to-end case each rather than a place in the matrix. */
const SMOKE_PACKAGE_MANAGERS = ['bun', 'pnpm', 'yarn'];

/**
 * Covering strength for the matrix.
 *
 * Strength 2 is ~49 cases, and each one installs a real dependency tree and runs five gates over it --
 * minutes apiece. That is the same order of magnitude next.js runs (48 combinations, ~15 minutes, one of
 * the slowest files in their CI), and it is the honest ceiling for a tier that does real work per case.
 */
const DEFAULT_STRENGTH = 2;

/**
 * Concurrent shards.
 *
 * Lower than the other tiers on purpose: every shard is running an install and a bundler, so this is
 * bounded by disk and by registry politeness rather than by cores.
 */
const DEFAULT_WORKERS = 4;

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/** The line a shard prints its result on, so the coordinator can ignore everything else it writes. */
const RESULT_MARKER = '__SHARD_RESULT__ ';

interface CaseOutcome {
  answers: Answers;
  index: number;
  result: GateResult;
}

interface Options {
  keepFailures: boolean;
  limit: number;
  outRoot: string;
  report: null | string;
  resolvedPath: string;
  shard: null | ShardSpec;
  strength: number;
  workers: number;
}

interface ResolvedExternals {
  minAppVersion: string;
  versions: Record<string, string>;
}

interface ShardResult {
  outcomes: CaseOutcome[];
}

interface ShardSpec {
  index: number;
  total: number;
}

await main();

/**
 * The cases the gate runs: a covering array under one package manager, plus one case per other manager.
 *
 * Deterministic, so a shard can rebuild the identical list and address its own cases by position, and so
 * a failing case number means the same thing on a re-run.
 */
function buildMatrix(strength: number): Answers[] {
  const packageManagerIndex = ANSWER_SPACE.findIndex((dimension) => dimension.answerKey === 'packageManager');
  const npmIndex = findDimension('packageManager').values.indexOf(MATRIX_PACKAGE_MANAGER);
  const seen = new Set<string>();
  const cases: Answers[] = [];

  for (const values of buildCoveringArray({ dimensionSizes: ANSWER_SPACE_DIMENSION_SIZES, strength })) {
    const pinned = [...values];
    pinned[packageManagerIndex] = npmIndex;
    const key = pinned.join(',');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    cases.push(answersFromValueIndices(pinned));
  }

  for (const packageManager of SMOKE_PACKAGE_MANAGERS) {
    cases.push(makeAnswers({ packageManager }));
  }

  return cases;
}

function formatMinutes(milliseconds: number): string {
  return `${(milliseconds / MILLISECONDS_PER_SECOND / SECONDS_PER_MINUTE).toFixed(1)}m`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  mkdirSync(options.outRoot, { recursive: true });

  if (options.shard) {
    runShard(options, options.shard);
    return;
  }

  await runCoordinator(options);
}

function parseOptions(argv: readonly string[]): Options {
  function flag(name: string): string | undefined {
    return argv.find((argument) => argument.startsWith(`--${name}=`))?.split('=')[1];
  }

  const shardParts = flag('shard')?.split('/').map(Number);
  const outRoot = flag('out') ?? join(tmpdir(), 'cg');

  return {
    keepFailures: argv.includes('--keep'),
    limit: Number(flag('limit') ?? Number.MAX_SAFE_INTEGER),
    outRoot,
    report: flag('report') ?? null,
    resolvedPath: flag('resolved') ?? join(outRoot, 'resolved-versions.json'),
    shard: shardParts ? { index: shardParts[0] ?? 0, total: shardParts[1] ?? 1 } : null,
    strength: Number(flag('strength') ?? DEFAULT_STRENGTH),
    workers: Number(flag('workers') ?? Math.min(DEFAULT_WORKERS, Math.max(1, availableParallelism() - 2)))
  };
}

function reportOutcomes(outcomes: readonly CaseOutcome[]): void {
  const failed = outcomes.filter((outcome) => outcome.result.violations.length > 0);

  write(`\n${String(outcomes.length - failed.length)} of ${String(outcomes.length)} cases passed every gate their answers emit.`);

  const stepCounts = new Map<string, number>();
  for (const outcome of outcomes) {
    for (const step of outcome.result.passed) {
      stepCounts.set(step, (stepCounts.get(step) ?? 0) + 1);
    }
  }
  write('\nGate steps that ran and passed:');
  for (const [step, count] of [...stepCounts].sort(([a], [b]) => a.localeCompare(b))) {
    write(`  ${step.padEnd(10)} ${String(count)}`);
  }

  if (failed.length === 0) {
    write('\nNo violations.');
    return;
  }

  write(`\n${String(failed.length)} case(s) failed:`);
  for (const outcome of failed) {
    write(`\n  case ${String(outcome.index)} -- ${describeCase(outcome.answers)}`);
    for (const violation of outcome.result.violations) {
      write(`    [${violation.step}] ${violation.kind}`);
      for (const line of violation.detail.split('\n').slice(0, 12)) {
        write(`      ${line}`);
      }
    }
  }
}

/**
 * Resolves every package the matrix can name, once, and hands the map to every shard.
 *
 * Resolution is answer-independent -- a package's spec comes from the pin table or the registry's
 * current `latest`, not from the case -- so resolving per case would be the same lookups repeated fifty
 * times. Doing it once also means every case in a run is gated against the SAME dependency versions,
 * which is what makes two cases' results comparable.
 */
async function resolveOnce(cases: readonly Answers[], resolvedPath: string): Promise<void> {
  const names = new Set<string>();
  for (const answers of cases) {
    for (const dependency of buildTemplate(answers).dependencies) {
      names.add(dependency.packageName);
    }
  }

  const [versions, minAppVersion] = await Promise.all([
    resolveVersions([...names].map((packageName) => ({ packageName, version: null }))),
    fetchLatestObsidianVersion()
  ]);

  const resolved: ResolvedExternals = {
    minAppVersion,
    versions: Object.fromEntries(versions)
  };
  writeFileSync(resolvedPath, JSON.stringify(resolved));
  write(`Resolved ${String(names.size)} package versions once, shared by every case.`);
}

async function runCoordinator(options: Options): Promise<void> {
  const started = Date.now();
  const cases = buildMatrix(options.strength).slice(0, options.limit);

  write(`Generating, installing and gating ${String(cases.length)} projects on ${String(options.workers)} workers.`);
  write(`  matrix         strength-${String(options.strength)} covering array under ${MATRIX_PACKAGE_MANAGER}`);
  write(`  smoke cases    one each for ${SMOKE_PACKAGE_MANAGERS.join(', ')}`);
  write(`  output root    ${options.outRoot}`);
  write('This tier does real work per case -- expect minutes each.\n');

  await resolveOnce(cases, options.resolvedPath);

  const results = await Promise.all(spawnShards(options));
  const outcomes = results.flatMap((result) => result.outcomes).sort((a, b) => a.index - b.index);

  write(`\nFinished in ${formatMinutes(Date.now() - started)}.`);
  reportOutcomes(outcomes);

  if (options.report !== null) {
    writeFileSync(options.report, JSON.stringify(outcomes, null, 2));
    write(`\nFull report written to ${options.report}`);
  }

  if (outcomes.some((outcome) => outcome.result.violations.length > 0)) {
    process.exitCode = 1;
  }
}

/**
 * Generates and gates this shard's cases.
 *
 * Round-robin over the matrix rather than a contiguous block: the covering array is emitted in a
 * systematic order, so a contiguous slice concentrates one answer's variants -- and their cost, which
 * here is an install and a bundler run -- into a single shard.
 */
function runShard(options: Options, shard: ShardSpec): void {
  const cases = buildMatrix(options.strength).slice(0, options.limit);
  const resolved = JSON.parse(readFileSync(options.resolvedPath, 'utf-8')) as ResolvedExternals;
  const versions = new Map(Object.entries(resolved.versions));
  const outcomes: CaseOutcome[] = [];

  for (let index = shard.index; index < cases.length; index += shard.total) {
    const answers = cases[index];
    if (!answers) {
      continue;
    }

    const targetDir = mkdtempSync(join(options.outRoot, 'c-'));
    copyTemplates(answers, targetDir, '0.0.0', null, versions, resolved.minAppVersion);
    const result = runGate(targetDir, answers);
    const failed = result.violations.length > 0;

    // Appended per case rather than written once at the end. This tier runs for the better part of an
    // Hour, so a run that is interrupted -- and a long one eventually is -- must not lose everything it
    // Had already established. The coordinator's merged report is a convenience on top of this.
    appendFileSync(join(options.outRoot, `shard-${String(shard.index)}.jsonl`), `${JSON.stringify({ answers, index, result } satisfies CaseOutcome)}\n`);

    outcomes.push({ answers, index, result });
    process.stderr.write(`  case ${String(index)}: ${failed ? `${String(result.violations.length)} violation(s)` : 'ok'}\n`);

    // A failing project is worth keeping only when asked for -- it carries a full `node_modules`, and
    // Fifty of those fill a disk faster than anyone reads the report.
    if (failed && options.keepFailures) {
      process.stderr.write(`    kept at ${targetDir}\n`);
    } else {
      rmSync(targetDir, { force: true, recursive: true });
    }
  }

  process.stdout.write(`${RESULT_MARKER}${JSON.stringify({ outcomes } satisfies ShardResult)}\n`);
}

function spawnShard(options: Options, index: number): Promise<ShardResult> {
  return new Promise((resolve, reject) => {
    // One command string rather than an args array: `jiti` is a `.cmd` shim on Windows and so needs the
    // Shell, and passing a separate args array alongside `shell: true` is deprecated (DEP0190).
    const keep = options.keepFailures ? ' --keep' : '';
    const command = `jiti scripts/verify-generated-projects.ts --shard=${String(index)}/${String(options.workers)}`
      + ` --strength=${String(options.strength)} --limit=${String(options.limit)} --out=${options.outRoot} --resolved=${options.resolvedPath}${keep}`;
    const child = spawn(command, { shell: true, stdio: ['ignore', 'pipe', 'inherit'] });

    let stdout = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });

    child.on('error', reject);
    child.on('close', (code) => {
      const line = stdout.split('\n').find((candidate) => candidate.startsWith(RESULT_MARKER));
      if (!line) {
        reject(new Error(`Shard ${String(index)} exited with code ${String(code)} without reporting a result.`));
        return;
      }
      resolve(JSON.parse(line.slice(RESULT_MARKER.length)) as ShardResult);
    });
  });
}

function spawnShards(options: Options): Promise<ShardResult>[] {
  const shards: Promise<ShardResult>[] = [];
  for (let index = 0; index < options.workers; index++) {
    shards.push(spawnShard(options, index));
  }
  return shards;
}

function write(line: string): void {
  process.stdout.write(`${line}\n`);
}
