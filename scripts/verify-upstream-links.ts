import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync
} from 'node:fs';
import {
  dirname,
  join,
  resolve
} from 'node:path';
import process from 'node:process';

import type { UpstreamLink } from '../src/upstream-links.ts';

import { getScriptDir } from '../src/templates.ts';
import {
  findDeadUpstreamLinks,
  findUpstreamLinks
} from '../src/upstream-links.ts';

/** Where CI puts its checkout, since a runner has no sibling directory to find one in. */
const ODU_DIR_ENV = 'OBSIDIAN_DEV_UTILS_DIR';

const MAX_GIT_OUTPUT = 64 * 1024 * 1024;

main();

function listFilesAt(oduDir: string, ref: string): ReadonlySet<string> | undefined {
  // The remote-tracking branch first: it is as fresh as the checkout's last fetch, where a local branch is
  // As fresh as its last pull. Nothing here fetches, so the answer is only ever as current as the checkout.
  for (const rev of [`origin/${ref}`, ref]) {
    const result = spawnSync('git', ['ls-tree', '-r', '--name-only', rev], { cwd: oduDir, encoding: 'utf-8', maxBuffer: MAX_GIT_OUTPUT });
    if (result.status === 0) {
      return new Set(result.stdout.split('\n').map((line) => line.trim()).filter((line) => line !== ''));
    }
  }

  return undefined;
}

function listOwnFiles(repoRoot: string): string[] {
  const result = spawnSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf-8', maxBuffer: MAX_GIT_OUTPUT });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed in ${repoRoot}: ${result.stderr}`);
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    // A test file's links are fixtures, and some are dead on purpose.
    .filter((line) => line !== '' && !line.endsWith('.test.ts'));
}

function main(): void {
  const repoRoot = join(getScriptDir(), '..');
  const oduDir = parseOduDir(process.argv.slice(2), repoRoot);

  if (!existsSync(join(oduDir, '.git'))) {
    // Not a pass. A check with nothing to check against is exactly how a dead link survived seven months.
    process.stderr.write(`No obsidian-dev-utils checkout at ${oduDir}.\n`);
    process.stderr.write(`Clone https://github.com/mnaoumov/obsidian-dev-utils there, or point --odu-dir or ${ODU_DIR_ENV} at one.\n`);
    process.exit(1);
  }

  const links: UpstreamLink[] = [];
  for (const file of listOwnFiles(repoRoot)) {
    const path = join(repoRoot, file);
    if (!existsSync(path)) {
      continue;
    }
    links.push(...findUpstreamLinks(file, readFileSync(path, 'utf-8')));
  }

  if (links.length === 0) {
    // The stylesheet templates cite two, so finding none means the extraction broke, not that all is well.
    process.stderr.write('Found no links into obsidian-dev-utils at all, which means the scan is broken.\n');
    process.exit(1);
  }

  const filesByRef = new Map<string, ReadonlySet<string> | undefined>();
  const dead = findDeadUpstreamLinks(links, (ref) => {
    if (!filesByRef.has(ref)) {
      filesByRef.set(ref, listFilesAt(oduDir, ref));
    }
    return filesByRef.get(ref);
  });

  process.stdout.write(`Checked ${String(links.length)} obsidian-dev-utils link(s) against ${oduDir}\n`);
  if (dead.length === 0) {
    return;
  }

  process.stdout.write(`\n${String(dead.length)} dead:\n`);
  for (const { link, reason } of dead) {
    process.stdout.write(`  ${link.file}:${String(link.line)}  ${link.url}\n      ${reason}\n`);
  }
  process.stdout.write('\nPoint each one at where the file lives now. If the checkout is stale, `git fetch` it first.\n');
  process.exit(1);
}

function parseOduDir(argv: readonly string[], repoRoot: string): string {
  // The default is the sibling checkout, which is where it sits in the workspace this repo lives in.
  let oduDir = process.env[ODU_DIR_ENV] ?? join(dirname(resolve(repoRoot)), 'obsidian-dev-utils');

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--odu-dir') {
      index++;
      const value = argv[index];
      if (value === undefined) {
        throw new Error('--odu-dir needs a directory.');
      }
      oduDir = value;
    } else {
      throw new Error(`Unknown argument ${String(argument)}. Accepts --odu-dir <dir>.`);
    }
  }

  return resolve(oduDir);
}
