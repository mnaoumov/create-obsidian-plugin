import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import process from 'node:process';

import type { Answers } from '../src/answers.ts';
import type { PlanViolation } from '../src/plan-checks.ts';
import type { MissingPackage } from '../src/versions.ts';

import {
  ANSWER_SPACE,
  ANSWER_SPACE_DIMENSION_SIZES,
  ANSWER_SPACE_SIZE,
  answersAtOrdinal,
  answersFromValueIndices,
  describeCase
} from '../src/answer-space.ts';
import { buildCoveringArray } from '../src/covering-array.ts';
import {
  checkCase,
  checkUsage,
  loadTemplateInventory,
  newUsage
} from '../src/plan-checks.ts';
import { buildTemplate } from '../src/templates.ts';
import { findMissingPackages } from '../src/versions.ts';

/**
 * Step between successive visited ordinals.
 *
 * Any value coprime to {@link ANSWER_SPACE_SIZE} walks the whole space as a permutation, so the same
 * mechanism serves both the sample and the exhaustive run -- the exhaustive one just does not stop early.
 * The space factors into 2, 3, 5 and 7 alone (it is a product of dimension sizes 2..7), so any larger
 * prime is coprime to it.
 *
 * Why not simply count 0, 1, 2, ...: consecutive ordinals differ only in the lowest dimensions, so a
 * shard taking every Nth ordinal would see some dimensions FROZEN whenever N shares a factor with their
 * radix -- with 10 workers and the first two dimensions sized 2 and 5, each shard would test exactly one
 * of the ten combinations of those two. That is the contiguous-slice trap in its worst form.
 */
const ORDINAL_STRIDE = 1_000_003;

/** How many combinations the sample visits unless told otherwise. Roughly a minute on a 12-core box. */
const DEFAULT_SAMPLE_SIZE = 5_000_000;

/** Covering-array strength for the exhaustively-checked interaction pass that runs alongside the sample. */
const DEFAULT_STRENGTH = 3;

/** Violations kept per kind. Enough to see the shape of a failure without printing millions of lines. */
const SAMPLES_PER_KIND = 5;

/** Distinct dependency signatures a shard will return before it stops collecting them. */
const MAX_SIGNATURES = 200_000;

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;
const MICROSECONDS_PER_MILLISECOND = 1000;
const PERCENT = 100;
const PROGRESS_INTERVAL = 2_000_000;

/** The line a shard prints its result on, so the coordinator can ignore everything else it writes. */
const RESULT_MARKER = '__SHARD_RESULT__ ';

interface ShardResult {
  casesChecked: number;
  partialNames: string[];
  registeredPaths: string[];
  signatureCount: number;
  /** Whether this shard stopped collecting signatures at the cap, so the reported count is a floor. */
  signaturesTruncated: boolean;
  signatures: string[];
  violations: PlanViolation[];
}

interface Options {
  checkRegistry: boolean;
  exhaustive: boolean;
  sampleSize: number;
  shard: null | ShardSpec;
  strength: number;
  workers: number;
}

interface ShardSpec {
  index: number;
  total: number;
}

await main();

/**
 * Which questions were never seen to change the dependency set, over the covering-array cases.
 *
 * A **sample**, and labelled as one wherever it is printed. Proving inertness over the whole space would
 * mean re-checking every case against every other value of every question -- roughly 46 extra plans per
 * case, on top of a sweep that is already the expensive part. This varies each question in turn from
 * every covering-array case instead, which is many diverse bases rather than the single base a
 * one-at-a-time probe uses.
 *
 * Nothing downstream depends on the answer being complete: the install tier groups its cases by their
 * actual dependency signature, not by this list.
 */
function findInertQuestions(cases: readonly (readonly number[])[]): string[] {
  const inert: string[] = [];

  for (const [dimensionIndex, dimension] of ANSWER_SPACE.entries()) {
    let moved = false;
    for (const values of cases) {
      const signatures = new Set<string>();
      for (let value = 0; value < dimension.values.length; value++) {
        const varied = [...values];
        varied[dimensionIndex] = value;
        signatures.add(safeDependencyKey(varied));
      }
      if (signatures.size > 1) {
        moved = true;
        break;
      }
    }
    if (!moved) {
      inert.push(dimension.answerKey);
    }
  }

  return inert;
}

function formatDuration(milliseconds: number): string {
  const seconds = milliseconds / MILLISECONDS_PER_SECOND;
  if (seconds < SECONDS_PER_HOUR) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${(seconds / SECONDS_PER_HOUR).toFixed(1)}h`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

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

  const exhaustive = argv.includes('--exhaustive');
  const shardFlag = flag('shard');
  const shardParts = shardFlag?.split('/').map(Number);

  return {
    checkRegistry: argv.includes('--check-registry'),
    exhaustive,
    sampleSize: exhaustive ? ANSWER_SPACE_SIZE : Number(flag('sample') ?? DEFAULT_SAMPLE_SIZE),
    shard: shardParts ? { index: shardParts[0] ?? 0, total: shardParts[1] ?? 1 } : null,
    strength: Number(flag('strength') ?? DEFAULT_STRENGTH),
    workers: Number(flag('workers') ?? Math.max(1, availableParallelism() - 2))
  };
}

/** Reports the interaction pass, whose findings are exhaustive over every combination of `strength` answers. */
function reportCoveringArray(strength: number, caseCount: number, violations: readonly PlanViolation[], inert: readonly string[]): void {
  write(`\nInteraction pass (strength ${String(strength)})`);
  write(`  cases                       ${String(caseCount)}`);
  write(`  every combination of any ${String(strength)} answers appears in at least one case`);
  write(`  violations                  ${String(violations.length)}`);
  write(`  questions not seen to move the dependency set (SAMPLE over ${String(caseCount)} bases, not a proof):`);
  write(`    ${inert.length > 0 ? inert.join(', ') : '(none)'}`);
}

/**
 * Reports the package names the answer space can produce, and which the registry has no record of.
 *
 * Off by default because it is the one pass that needs the network. It is worth running before any
 * release: a name that resolves to nothing still reaches `package.json`, because `resolveVersions`
 * falls back to the literal `latest` so that generating offline works, so the only symptom is a failed
 * `npm install` in someone else's project.
 */
function reportPackages(options: Options, total: number, missing: readonly MissingPackage[]): void {
  write(`\nPackages the covering array can declare: ${String(total)}`);
  if (!options.checkRegistry) {
    write('  registry existence            not checked (pass --check-registry)');
    return;
  }
  write(`  missing from the registry     ${String(missing.length)}`);
  for (const entry of missing) {
    write(`    ${entry.packageName}: ${entry.reason}`);
  }
}

function reportViolations(violations: readonly PlanViolation[]): void {
  if (violations.length === 0) {
    write('\nNo violations.');
    return;
  }

  write(`\n${String(violations.length)} violation(s):`);
  const byKind = new Map<string, PlanViolation[]>();
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
  const inventory = loadTemplateInventory();
  const started = Date.now();

  write(`Answer space: ${ANSWER_SPACE_SIZE.toLocaleString('en-US')} combinations across ${String(ANSWER_SPACE.length)} questions.`);
  if (options.exhaustive) {
    warnAboutExhaustiveCost(options.workers);
  } else {
    write(`Sampling ${options.sampleSize.toLocaleString('en-US')} of them (${(options.sampleSize / ANSWER_SPACE_SIZE * PERCENT).toFixed(4)}%) on ${String(options.workers)} workers.`);
    write('Pass --exhaustive to check every combination instead; it prints its projected cost first.');
  }

  const shards = spawnShards(options);

  // Built here, on the coordinator, while the shards run: at strength 4 the covering array takes minutes
  // To construct and milliseconds to check, so the construction is what wants overlapping with the sample.
  const coveringCases = buildCoveringArray({ dimensionSizes: ANSWER_SPACE_DIMENSION_SIZES, strength: options.strength });
  const coveringViolations: PlanViolation[] = [];
  const usage = newUsage();
  const packageNames = new Set<string>();
  for (const values of coveringCases) {
    const answers = answersFromValueIndices(values);
    coveringViolations.push(...checkCase(answers, inventory, usage).violations);
    for (const packageName of packagesFor(answers)) {
      packageNames.add(packageName);
    }
  }
  const inert = findInertQuestions(coveringCases);

  const results = await Promise.all(shards);
  const signatures = new Set<string>();
  const violations: PlanViolation[] = [...coveringViolations];
  let casesChecked = coveringCases.length;
  let signatureTotal = 0;
  let truncated = false;

  for (const result of results) {
    casesChecked += result.casesChecked;
    signatureTotal += result.signatureCount;
    truncated ||= result.signaturesTruncated;
    violations.push(...result.violations);
    for (const signature of result.signatures) {
      signatures.add(signature);
    }
    for (const partialName of result.partialNames) {
      usage.partialNames.add(partialName);
    }
    for (const path of result.registeredPaths) {
      usage.registeredPaths.add(path);
    }
  }

  const usageViolations = checkUsage(usage, inventory);
  const missingPackages = options.checkRegistry ? await findMissingPackages([...packageNames]) : [];
  const elapsed = Date.now() - started;

  write(`\nChecked ${casesChecked.toLocaleString('en-US')} combinations in ${formatDuration(elapsed)}.`);
  write(`  coverage                    ${options.exhaustive ? 'EXHAUSTIVE -- every combination' : `${(casesChecked / ANSWER_SPACE_SIZE * PERCENT).toFixed(4)}% of the space`}`);
  // Said as a floor when a shard hit the cap, because a count that quietly stopped rising reads as a
  // Finding about the generator rather than about the collector.
  write(`  distinct dependency sets    ${truncated ? 'at least ' : ''}${String(signatures.size)}${signatureTotal > signatures.size ? ` (from ${String(signatureTotal)} collected)` : ''}`);
  if (truncated) {
    write(`    a shard stopped collecting at ${String(MAX_SIGNATURES)}; the true count is higher`);
  }
  reportCoveringArray(options.strength, coveringCases.length, coveringViolations, inert);
  reportPackages(options, packageNames.size, missingPackages);
  reportViolations([...violations, ...usageViolations]);

  if (violations.length > 0 || usageViolations.length > 0 || missingPackages.length > 0) {
    process.exitCode = 1;
  }
}

function runShard(options: Options, shard: ShardSpec): void {
  const inventory = loadTemplateInventory();
  const usage = newUsage();
  const signatures = new Set<string>();
  const violations: PlanViolation[] = [];
  const seenKinds = new Map<string, number>();

  const step = Number(BigInt(options.workers) * BigInt(ORDINAL_STRIDE) % BigInt(ANSWER_SPACE_SIZE));
  let ordinal = Number(BigInt(shard.index) * BigInt(ORDINAL_STRIDE) % BigInt(ANSWER_SPACE_SIZE));
  let casesChecked = 0;

  for (let index = shard.index; index < options.sampleSize; index += shard.total) {
    const result = checkCase(answersAtOrdinal(ordinal), inventory, usage);
    casesChecked++;

    if (result.dependencySignature !== null && signatures.size < MAX_SIGNATURES) {
      signatures.add(result.dependencySignature);
    }

    for (const violation of result.violations) {
      const seen = seenKinds.get(violation.kind) ?? 0;
      seenKinds.set(violation.kind, seen + 1);
      if (seen < SAMPLES_PER_KIND) {
        violations.push({
          ...violation,
          detail: `${violation.detail}
      reproduce with ordinal ${String(ordinal)}: ${describeCase(answersAtOrdinal(ordinal))}`
        });
      }
    }

    ordinal += step;
    if (ordinal >= ANSWER_SPACE_SIZE) {
      ordinal -= ANSWER_SPACE_SIZE;
    }

    if (casesChecked % PROGRESS_INTERVAL === 0 && shard.index === 0) {
      process.stderr.write(`  shard 0: ${casesChecked.toLocaleString('en-US')} cases\n`);
    }
  }

  const result: ShardResult = {
    casesChecked,
    partialNames: [...usage.partialNames],
    registeredPaths: [...usage.registeredPaths],
    signatureCount: signatures.size,
    signaturesTruncated: signatures.size >= MAX_SIGNATURES,
    signatures: [...signatures],
    violations
  };
  process.stdout.write(`${RESULT_MARKER}${JSON.stringify(result)}\n`);
}

/** The package names one case declares, or none when its plan cannot be built. */
function packagesFor(answers: Answers): string[] {
  try {
    return buildTemplate(answers).dependencies.map((dependency) => dependency.packageName);
  } catch {
    return [];
  }
}

/** Builds one case's dependency key, treating a plan that cannot be built as its own distinct outcome. */
function safeDependencyKey(valueIndices: readonly number[]): string {
  try {
    return buildTemplate(answersFromValueIndices(valueIndices)).dependencies.map((dependency) => `${dependency.packageName}@${dependency.version ?? '*'}`).join(',');
  } catch {
    return '<threw>';
  }
}

function spawnShard(options: Options, index: number): Promise<ShardResult> {
  return new Promise((resolve, reject) => {
    // One command string rather than an args array: `jiti` is a `.cmd` shim on Windows and so needs the
    // Shell, and passing a separate args array alongside `shell: true` is deprecated (DEP0190). Every
    // Interpolated value here is a number this process computed, so there is nothing to escape.
    const child = spawn(`jiti scripts/verify-answer-space.ts --shard=${String(index)}/${String(options.workers)} --sample=${String(options.sampleSize)}`, {
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

/**
 * States what an exhaustive run will cost before starting one, rather than after.
 *
 * Measured 2026-08-30 on a 12-core box: 32 us per case, so the whole space is ~134 hours single-threaded
 * and ~13 hours on ten workers. That is a deliberate, stated choice -- not a run someone starts by
 * accident and kills an hour later.
 */
function warnAboutExhaustiveCost(workers: number): void {
  const microsecondsPerCase = 32;
  const hours = ANSWER_SPACE_SIZE * microsecondsPerCase / MICROSECONDS_PER_MILLISECOND / MILLISECONDS_PER_SECOND / SECONDS_PER_HOUR;
  write(`EXHAUSTIVE: every combination, projected ~${(hours / workers).toFixed(1)}h on ${String(workers)} workers at the measured ~${String(microsecondsPerCase)}us per case.`);
  write('Ctrl+C now if that was not the intent; the default sample plus interaction pass takes under a minute.');
}

function write(line: string): void {
  process.stdout.write(`${line}\n`);
}
