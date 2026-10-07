import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { findStalePins } from '../src/generated-project-checks.ts';

const PLUGIN_ID = 'smoke-test';

interface PackResult {
  filename: string;
}

await main();

/**
 * Scaffolds the default answers from a packed tarball, exactly as a user's `npm create` would, and holds the
 * result to its own release preflight.
 *
 * Every other tier runs the generator from source. This one runs what `npm publish` would ship -- `dist/`
 * plus the `files` list -- so a template left out of the tarball fails here and nowhere else. It also
 * installs against today's registry, which is what a fresh project meets on the day it is generated: the
 * repo's own build, lint and tests were all green while a stale pin left every default scaffold failing
 * `npm install` on ERESOLVE.
 *
 * Needs the network, and takes a few minutes. Run it before every release; `prepublishOnly` does.
 */
async function main(): Promise<void> {
  const keep = process.argv.includes('--keep');
  const root = mkdtempSync(join(tmpdir(), 'cop-tarball-'));
  const repoDir = process.cwd();
  let failed = true;

  try {
    run('npm run build', repoDir);

    // `--ignore-scripts`: `prepare` runs husky, which prints to stdout under `HUSKY=0` and breaks the JSON.
    const packOutput = capture(`npm pack --json --ignore-scripts --pack-destination "${root}"`, repoDir);
    const [pack] = JSON.parse(packOutput) as PackResult[];
    if (!pack) {
      throw new Error(`npm pack reported nothing:\n${packOutput}`);
    }
    const tarball = join(root, pack.filename);

    const runnerDir = join(root, 'runner');
    mkdirSync(runnerDir);
    writeFileSync(join(runnerDir, 'package.json'), '{ "private": true }\n');
    run(`npm install --no-audit --no-fund "${tarball}"`, runnerDir);

    const cli = join(runnerDir, 'node_modules', '@mnaoumov', 'create-obsidian-plugin', 'dist', 'main.js');
    run(`node "${cli}" --yes --pluginId=${PLUGIN_ID}`, root);

    const projectDir = join(root, `obsidian-${PLUGIN_ID}`);
    run('npm install', projectDir);

    const stale = findStalePins(readFileSync(join(projectDir, 'pinned-versions.json'), 'utf-8'), (command) => {
      const result = spawnSync(command, { cwd: projectDir, encoding: 'utf-8', shell: true });
      return { ok: result.status === 0, output: `${result.stdout}${result.stderr}`.trim() };
    });
    if (stale.length > 0) {
      throw new Error(`Stale pins in pinned-versions.json -- follow each to its new range, or drop it:\n${stale.join('\n')}`);
    }
    process.stdout.write('\nEvery pin in pinned-versions.json still holds.\n');

    run('npm run build', projectDir);
    run('npm run gate', projectDir);

    failed = false;
    process.stdout.write(`\nThe packed tarball scaffolds a project that installs, builds and passes its own gate.\n`);
  } catch (error: unknown) {
    process.stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n`);
  } finally {
    if (failed || keep) {
      process.stdout.write(`\nKept at ${root}\n`);
    } else {
      rmSync(root, { force: true, recursive: true });
    }
  }

  process.exitCode = failed ? 1 : 0;
}

function capture(command: string, cwd: string): string {
  const result = spawnSync(command, { cwd, encoding: 'utf-8', shell: true, stdio: ['ignore', 'pipe', 'inherit'] });
  if (result.status !== 0) {
    throw new Error(`Failed (${String(result.status)}): ${command}`);
  }
  return result.stdout;
}

function run(command: string, cwd: string): void {
  process.stdout.write(`\n> ${command}\n`);
  const result = spawnSync(command, { cwd, shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Failed (${String(result.status)}): ${command}\n  in ${cwd}`);
  }
}
