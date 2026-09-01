import {
  mkdirSync,
  mkdtempSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import type {
  Answers,
  StringAnswerKey
} from '../src/answers.ts';

import {
  ANSWER_SPACE,
  describeCase,
  makeAnswers
} from '../src/answer-space.ts';
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
 * The version stamped into the generated project. Nothing the gate asks depends on it.
 */
const GATE_VERSION = '0.0.0';

interface Options {
  keep: boolean;
  outRoot: null | string;
  overrides: Partial<Record<StringAnswerKey, string>>;
}

await main();

/**
 * Installs and gates ONE answer combination.
 *
 * The companion to `render:case`, and needed for the same reason. `verify:projects` sweeps ~50 cases
 * over the better part of an hour, which is the wrong tool for "does THIS combination build, and what
 * did the bundler actually emit?" -- the question asked while changing a bundler's configuration. This
 * runs the identical {@link runGate} against a single case, in the minute or two one case costs.
 */
async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const answers = makeAnswers(options.overrides as Partial<Answers>);
  process.stdout.write(`${describeCase(answers)}\n\n`);

  const versions = await resolveVersions(buildTemplate(answers).dependencies);
  const minAppVersion = await fetchLatestObsidianVersion();

  const target = options.outRoot ?? mkdtempSync(join(tmpdir(), 'cop-gate-'));
  if (options.outRoot) {
    mkdirSync(options.outRoot, { recursive: true });
  }

  copyTemplates(answers, target, GATE_VERSION, null, versions, minAppVersion);
  process.stdout.write(`Generated into ${target}\n\n`);

  const result = runGate(target, answers);

  process.stdout.write(`passed:  ${result.passed.join(', ') || '(none)'}\n`);
  process.stdout.write(`skipped: ${result.skipped.join(', ') || '(none)'}\n`);
  for (const violation of result.violations) {
    process.stdout.write(`\n[${violation.step}] ${violation.kind}\n${violation.detail}\n`);
  }

  if (options.keep || options.outRoot) {
    process.stdout.write(`\nKept at ${target}\n`);
  } else {
    rmSync(target, { force: true, recursive: true });
  }

  process.exitCode = result.violations.length > 0 ? 1 : 0;
}

function parseOptions(argv: readonly string[]): Options {
  const overrides: Partial<Record<StringAnswerKey, string>> = {};
  let outRoot: null | string = null;
  let keep = false;

  for (const argument of argv) {
    if (argument === '--keep') {
      keep = true;
      continue;
    }

    if (argument.startsWith('--out=')) {
      outRoot = argument.slice('--out='.length);
      continue;
    }

    const [key, ...rest] = argument.split('=');
    if (key === undefined || rest.length === 0) {
      throw new Error(`Expected <question>=<answer>, got "${argument}".`);
    }

    if (!ANSWER_SPACE.some((dimension) => dimension.answerKey === key)) {
      throw new Error(`Unknown question "${key}".`);
    }

    overrides[key as StringAnswerKey] = rest.join('=');
  }

  return { keep, outRoot, overrides };
}
