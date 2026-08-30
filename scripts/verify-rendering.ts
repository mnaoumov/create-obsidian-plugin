import { spawn } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync
} from 'node:fs';
import {
  availableParallelism,
  tmpdir
} from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import type { RenderViolation } from '../src/render-checks.ts';

import {
  ANSWER_SPACE_DIMENSION_SIZES,
  answersFromValueIndices,
  describeCase
} from '../src/answer-space.ts';
import { buildCoveringArray } from '../src/covering-array.ts';
import { renderAndCheck } from '../src/render-checks.ts';

/**
 * How strongly the rendered sweep covers the space by default.
 *
 * Strength 3 is 265 cases at ~215 ms each -- about a minute across ten processes -- and every
 * combination of any three answers appears in at least one of them. Strength 4 is only 1239 cases but
 * takes three MINUTES to construct the array before rendering anything, which is why it is opt-in.
 */
const DEFAULT_STRENGTH = 3;

/** Violations printed per kind before the rest are counted. */
const SAMPLES_PER_KIND = 5;

const MILLISECONDS_PER_SECOND = 1000;

/** The line a shard prints its result on, so the coordinator can ignore everything else it writes. */
const RESULT_MARKER = '__SHARD_RESULT__ ';

interface Options {
  keepFailures: boolean;
  outRoot: string;
  shard: null | ShardSpec;
  strength: number;
  workers: number;
}

interface ShardResult {
  casesChecked: number;
  violations: RenderViolation[];
}

interface ShardSpec {
  index: number;
  total: number;
}

await main();

/**
 * Where rendered projects go.
 *
 * Configurable, because path length is a real constraint here: a generated project nests `scripts/`,
 * `src/views/` and `demo-vault/.obsidian/`, and the install tier adds `node_modules` under all of that.
 * Rendering alone fits comfortably under the temp directory; point `--out` at a short root if it does
 * not on your machine.
 */
function defaultOutRoot(): string {
  return join(tmpdir(), 'cop-verify');
}

function formatSeconds(milliseconds: number): string {
  return `${(milliseconds / MILLISECONDS_PER_SECOND).toFixed(1)}s`;
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

  return {
    keepFailures: argv.includes('--keep'),
    outRoot: flag('out') ?? defaultOutRoot(),
    shard: shardParts ? { index: shardParts[0] ?? 0, total: shardParts[1] ?? 1 } : null,
    strength: Number(flag('strength') ?? DEFAULT_STRENGTH),
    workers: Number(flag('workers') ?? Math.max(1, availableParallelism() - 2))
  };
}

function reportViolations(violations: readonly RenderViolation[]): void {
  if (violations.length === 0) {
    write('\nNo violations.');
    return;
  }

  write(`\n${String(violations.length)} violation(s):`);
  const byKind = new Map<string, RenderViolation[]>();
  for (const violation of violations) {
    byKind.set(violation.kind, [...byKind.get(violation.kind) ?? [], violation]);
  }

  for (const [kind, found] of [...byKind].sort(([a], [b]) => a.localeCompare(b))) {
    write(`\n  ${kind} (${String(found.length)})`);
    for (const violation of found.slice(0, SAMPLES_PER_KIND)) {
      write(`    ${violation.subject}`);
      write(`      ${violation.detail}`);
    }
    if (found.length > SAMPLES_PER_KIND) {
      write(`    ... and ${String(found.length - SAMPLES_PER_KIND)} more`);
    }
  }
}

async function runCoordinator(options: Options): Promise<void> {
  const started = Date.now();
  const caseCount = buildCoveringArray({ dimensionSizes: ANSWER_SPACE_DIMENSION_SIZES, strength: options.strength }).length;

  write(`Rendering a strength-${String(options.strength)} covering array: ${String(caseCount)} cases on ${String(options.workers)} workers.`);
  write(`Every combination of any ${String(options.strength)} answers appears in at least one case.`);
  write(`Output root: ${options.outRoot}`);

  const results = await Promise.all(spawnShards(options));
  const violations = results.flatMap((result) => result.violations);
  const casesChecked = results.reduce((total, result) => total + result.casesChecked, 0);

  write(`\nRendered and checked ${String(casesChecked)} cases in ${formatSeconds(Date.now() - started)}.`);
  reportViolations(violations);

  if (violations.length > 0) {
    process.exitCode = 1;
  }
}

/**
 * Renders this shard's slice of the covering array.
 *
 * The array is rebuilt here rather than handed over: the construction is deterministic, so every shard
 * derives the identical list and addresses its own cases by position. Cases are taken round-robin, not
 * as a contiguous block -- the construction emits them in a systematic order, so a contiguous slice
 * concentrates one answer's variants, and their cost, into one shard.
 */
function runShard(options: Options, shard: ShardSpec): void {
  const cases = buildCoveringArray({ dimensionSizes: ANSWER_SPACE_DIMENSION_SIZES, strength: options.strength });
  const violations: RenderViolation[] = [];
  let casesChecked = 0;

  for (let index = shard.index; index < cases.length; index += shard.total) {
    const values = cases[index];
    if (!values) {
      continue;
    }

    const answers = answersFromValueIndices(values);
    const targetDir = mkdtempSync(join(options.outRoot, 'case-'));
    let clean = true;

    try {
      for (const violation of renderAndCheck(answers, targetDir)) {
        clean = false;
        violations.push({
          ...violation,
          detail: `${violation.detail}\n      case: ${describeCase(answers)}${options.keepFailures ? `\n      kept at: ${targetDir}` : ''}`
        });
      }
      casesChecked++;
    } finally {
      if (clean || !options.keepFailures) {
        rmSync(targetDir, { force: true, recursive: true });
      }
    }
  }

  process.stdout.write(`${RESULT_MARKER}${JSON.stringify({ casesChecked, violations } satisfies ShardResult)}\n`);
}

function spawnShard(options: Options, index: number): Promise<ShardResult> {
  return new Promise((resolve, reject) => {
    // One command string rather than an args array: `jiti` is a `.cmd` shim on Windows and so needs the
    // Shell, and passing a separate args array alongside `shell: true` is deprecated (DEP0190).
    const keep = options.keepFailures ? ' --keep' : '';
    const child = spawn(`jiti scripts/verify-rendering.ts --shard=${String(index)}/${String(options.workers)} --strength=${String(options.strength)} --out=${options.outRoot}${keep}`, {
      shell: true,
      stdio: ['ignore', 'pipe', 'inherit']
    });

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
