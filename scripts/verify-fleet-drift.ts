import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  dirname,
  join,
  resolve
} from 'node:path';
import process from 'node:process';

import type {
  BaselineEntry,
  BaselineViolation,
  DriftFinding
} from '../src/fleet-drift-checks.ts';

import {
  buildConsensus,
  compareToFleet,
  describeFinding,
  discoverFleet,
  extractProfile,
  findingKey,
  fleetShapedAnswers,
  listGeneratedFiles,
  listTrackedFiles,
  reconcileBaseline
} from '../src/fleet-drift-checks.ts';
import {
  copyTemplates,
  getScriptDir
} from '../src/templates.ts';

/** Where the accepted differences are recorded, relative to the repo root. */
const BASELINE_FILE_NAME = 'fleet-drift-baseline.json';

const JSON_INDENT_SPACES = 2;

/**
 * The presets compared, and the scope each one's findings are filed under.
 *
 * Both, and not just the default: `isOduPreset` covers `enhanced` and `demo` alike, and `demo` forces a
 * second answer into several questions, so it emits files `enhanced` never does. A tier that checked
 * only the default would call those files verified when nothing had looked at them.
 */
const PRESETS = ['enhanced', 'demo'];

interface Baseline {
  accepted: Record<string, BaselineEntry>;
  comment?: string[];
}

interface Options {
  fleetRoot: string;
  json: boolean;
  printBaseline: boolean;
}

await main();

function loadBaseline(repoRoot: string): Baseline {
  const path = join(repoRoot, BASELINE_FILE_NAME);
  if (!existsSync(path)) {
    return { accepted: {} };
  }

  return JSON.parse(readFileSync(path, 'utf-8')) as Baseline;
}

async function main(): Promise<void> {
  const repoRoot = join(getScriptDir(), '..');
  const options = parseOptions(process.argv.slice(2), repoRoot);

  const fleetDirs = discoverFleet(options.fleetRoot);
  if (fleetDirs.length === 0) {
    // Not a pass. An empty fleet means the comparison never happened, and the whole design of this
    // Repo's verification is shaped around never letting "nothing ran" look like "nothing was wrong".
    process.stderr.write(`No plugins found under ${options.fleetRoot}.\n`);
    process.stderr.write('A fleet plugin is a directory with both a manifest.json and a src/main.ts.\n');
    process.stderr.write('Point --fleet at the workspace that holds them.\n');
    process.exit(1);
  }

  const notRepositories: string[] = [];
  const profiles = fleetDirs.map((dir) => {
    const files = listTrackedFiles(dir);
    if (files.length === 0) {
      notRepositories.push(dir);
    }
    return extractProfile(dir, files);
  });

  if (notRepositories.length > 0) {
    // Averaging a plugin that reported no files into the consensus would quietly lower every count,
    // Which is the one input every judgement in the baseline rests on.
    process.stderr.write(`These plugin directories reported no tracked files, so the consensus would be wrong:\n`);
    for (const dir of notRepositories) {
      process.stderr.write(`  ${dir}\n`);
    }
    process.exit(1);
  }

  const consensus = buildConsensus(profiles);
  process.stdout.write(`Fleet: ${String(consensus.total)} plugins under ${options.fleetRoot}\n`);

  const findingsByScope = new Map<string, readonly DriftFinding[]>();
  for (const preset of PRESETS) {
    findingsByScope.set(preset, findingsFor(preset, consensus));
  }

  const violations = reconcileBaseline(findingsByScope, loadBaseline(repoRoot).accepted);

  if (options.printBaseline) {
    printBaselineSkeleton(findingsByScope);
    return;
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ findings: Object.fromEntries(findingsByScope), violations }, null, JSON_INDENT_SPACES)}\n`);
  } else {
    report(findingsByScope, violations);
  }

  process.exit(violations.length === 0 ? 0 : 1);
}

/** Generates one preset the way the fleet is shaped, and compares what comes out. */
function findingsFor(preset: string, consensus: ReturnType<typeof buildConsensus>): DriftFinding[] {
  const target = mkdtempSync(join(tmpdir(), `cop-fleet-${preset}-`));
  try {
    // No resolved versions and no fetched `minAppVersion`: `copyTemplates` stays synchronous and offline,
    // And neither a dependency spec nor an app version is a trait this tier compares.
    copyTemplates(fleetShapedAnswers(preset), target, '0.0.0', null);
    return compareToFleet(consensus, extractProfile(target, listGeneratedFiles(target)));
  } finally {
    rmSync(target, { force: true, recursive: true });
  }
}

function parseOptions(argv: readonly string[], repoRoot: string): Options {
  // The workspace that holds the plugins is this repo's own parent, because that is where they live --
  // Each plugin is a sibling checkout. `--fleet` is for anyone whose layout differs.
  let fleetRoot = resolve(dirname(repoRoot));
  let json = false;
  let printBaseline = false;

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--fleet') {
      index++;
      const value = argv[index];
      if (value === undefined) {
        throw new Error('--fleet needs a directory.');
      }
      fleetRoot = resolve(value);
    } else if (argument === '--json') {
      json = true;
    } else if (argument === '--print-baseline') {
      printBaseline = true;
    } else {
      throw new Error(`Unknown argument ${String(argument)}. Accepts --fleet <dir>, --json, --print-baseline.`);
    }
  }

  return { fleetRoot, json, printBaseline };
}

/**
 * Prints a baseline skeleton covering every current finding, with each reason left to be written.
 *
 * A convenience for the transcription, deliberately not a way to accept drift: every `why` comes out as
 * a placeholder, so pasting this in unedited leaves the file visibly unfinished rather than quietly
 * blessing whatever the generator happens to emit today.
 */
function printBaselineSkeleton(findingsByScope: ReadonlyMap<string, readonly DriftFinding[]>): void {
  const accepted: Record<string, BaselineEntry> = {};
  for (const [scope, findings] of findingsByScope) {
    for (const finding of findings) {
      accepted[findingKey(finding, scope)] = { fleetCount: finding.fleetCount, why: `TODO -- ${describeFinding(finding)}` };
    }
  }

  process.stdout.write(`${JSON.stringify({ accepted }, null, JSON_INDENT_SPACES)}\n`);
}

function report(findingsByScope: ReadonlyMap<string, readonly DriftFinding[]>, violations: readonly BaselineViolation[]): void {
  for (const [scope, findings] of findingsByScope) {
    process.stdout.write(`\n${scope}: ${String(findings.length)} differences from the fleet\n`);
    for (const finding of findings) {
      process.stdout.write(`  ${findingKey(finding, scope)}\n      ${describeFinding(finding)}\n`);
    }
  }

  if (violations.length === 0) {
    process.stdout.write(`\nEvery difference is recorded in ${BASELINE_FILE_NAME}.\n`);
    return;
  }

  process.stdout.write(`\n${String(violations.length)} unreconciled:\n`);
  for (const violation of violations) {
    process.stdout.write(`  [${violation.kind}] ${violation.key}\n      ${violation.detail}\n`);
  }
  process.stdout.write(`\nEither fix the generator, or record the difference in ${BASELINE_FILE_NAME} with the reason it is deliberate.\n`);
  process.stdout.write(`\`npm run verify:fleet-drift -- --print-baseline\` prints a skeleton to fill in.\n`);
}
