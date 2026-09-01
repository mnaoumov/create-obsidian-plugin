import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  join,
  resolve
} from 'node:path';
import process from 'node:process';

import type {
  Answers,
  StringAnswerKey
} from '../src/answers.ts';

import {
  describeCase,
  makeAnswers
} from '../src/answer-space.ts';
import {
  assertValidAnswer,
  toAnswerKey
} from '../src/cli-args.ts';
import { listGeneratedFiles } from '../src/fleet-drift-checks.ts';
import { copyTemplates } from '../src/templates.ts';

/**
 * The version stamped into the render.
 *
 * Nothing this tool shows depends on it, and reading the real one would make looking at one template a
 * reason to keep `package.json` in the loop.
 */
const RENDER_VERSION = '0.0.0';

interface Options {
  outRoot: null | string;
  overrides: Partial<Record<StringAnswerKey, string>>;
  show: readonly string[];
}

main();

/**
 * Renders one answer combination and shows what it emitted.
 *
 * The three verification tiers each sweep the answer space, which is what they are for and what makes
 * them the wrong tool for "what does THIS combination actually emit?". That is the question asked while
 * changing a template, and answering it meant a scratch file written, used and thrown away each time --
 * so the next person wrote it again, differently, and quoted its output into an issue with no way to
 * reproduce it. T764's own report quoted such a transcript, and one of its two lines was wrong. This is
 * that scratch file, kept.
 */
function main(): void {
  const options = parseOptions(process.argv.slice(2));
  const answers = makeAnswers(options.overrides as Partial<Answers>);

  const target = options.outRoot ?? mkdtempSync(join(tmpdir(), 'cop-case-'));
  if (options.outRoot) {
    mkdirSync(options.outRoot, { recursive: true });
  }

  try {
    // No resolved versions and no fetched `minAppVersion`, exactly as the fleet-drift tier renders:
    // `copyTemplates` stays synchronous and offline, and a dependency spec is not what anyone runs this
    // To look at. Versions come out as the unresolved placeholder, which is honest about it.
    copyTemplates(answers, target, RENDER_VERSION, null);

    process.stdout.write(`${describeCase(answers)}\n`);

    if (options.show.length === 0) {
      showEmittedPaths(target);
      return;
    }

    for (const path of options.show) {
      showFile(target, path);
    }
  } finally {
    if (!options.outRoot) {
      rmSync(target, { force: true, recursive: true });
    }
  }
}

function parseOptions(argv: readonly string[]): Options {
  const overrides: Partial<Record<StringAnswerKey, string>> = {};
  let outRoot: null | string = null;
  let show: readonly string[] = [];

  for (const argument of argv) {
    if (argument.startsWith('--show=')) {
      show = argument.slice('--show='.length).split(',').map((path) => path.trim()).filter((path) => path !== '');
    } else if (argument.startsWith('--out=')) {
      outRoot = resolve(argument.slice('--out='.length));
    } else if (!argument.startsWith('--') && argument.includes('=')) {
      parseOverride(argument, overrides);
    } else {
      throw new Error(`Unknown argument "${argument}". Accepts <question>=<answer>, --show=<paths>, --out=<dir>.`);
    }
  }

  return { outRoot, overrides, show };
}

/**
 * Reads one `question=answer` override, refusing anything the answer space does not accept.
 *
 * A silently ignored typo is the failure mode worth spending code on: a misspelt question name would
 * render the DEFAULT answer to it and print output that looks like an answer to a question nobody
 * asked. Both halves are checked, so the tool cannot show one case while naming another.
 *
 * The checks are the CLI's own (`src/cli-args.ts`) rather than a second copy. This tool and `gate:case`
 * each carried one, and they had already diverged -- `gate-one-case.ts` validated the key and let any
 * value through. Sharing them also widens what both accept to the free-text answers, so a case can now
 * pin `pluginId` as well as the tooling questions.
 */
function parseOverride(argument: string, overrides: Partial<Record<StringAnswerKey, string>>): void {
  const separatorIndex = argument.indexOf('=');
  const key = toAnswerKey(argument.slice(0, separatorIndex));
  const value = argument.slice(separatorIndex + 1);

  assertValidAnswer(key, value);
  overrides[key] = value;
}

/** Lists what the case emitted, for when the question is which files exist at all. */
function showEmittedPaths(target: string): void {
  const paths = listGeneratedFiles(target);
  process.stdout.write(`\n${String(paths.length)} files emitted:\n`);
  for (const path of paths) {
    process.stdout.write(`  ${path}\n`);
  }
  process.stdout.write('\nPass --show=<comma-separated paths> to print any of them.\n');
}

/**
 * Prints one emitted file under a header naming it.
 *
 * A path the case did not emit is reported rather than skipped, and so is an empty one. "Never emitted"
 * and "emitted empty" are the two outcomes this repo's verification is shaped around never confusing --
 * an unresolved partial writes the file EMPTY rather than failing -- so the tool for looking at output
 * is the last place they should look alike.
 */
function showFile(target: string, path: string): void {
  const fullPath = join(target, path);
  process.stdout.write(`\n=== ${path} ===\n`);
  if (!existsSync(fullPath)) {
    process.stdout.write('(not emitted for this case)\n');
    return;
  }

  const content = readFileSync(fullPath, 'utf-8');
  process.stdout.write(content === '' ? '(emitted, but empty)\n' : content);
}
