import type { SpawnSyncReturns } from 'node:child_process';

import { spawnSync } from 'node:child_process';
import process from 'node:process';

import type {
  CommandResult,
  SyncDeps
} from '../src/upstream-sync.ts';

import { getUpstreamsPath } from '../src/official-sample.ts';
import { syncUpstreams } from '../src/upstream-sync.ts';

const DEFAULT_BASE_BRANCH = 'main';

await main();

/**
 * Checks every upstream in `upstreams.json` and opens or updates one PR per upstream that moved.
 *
 * `--dry-run` prints each PR it would open and changes nothing. `--only=<name>[,<name>]` limits it to those entries, and
 * `--base=<branch>` names the branch the PRs target (`main` by default). `GITHUB_TOKEN` is sent to the GitHub API when
 * set, and `gh` needs to be authenticated for anything but a dry run.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const only = readOption(args, 'only')?.split(',').filter((name) => name !== '') ?? [];
  const results = await syncUpstreams({
    baseBranch: readOption(args, 'base') ?? DEFAULT_BASE_BRANCH,
    configPath: getUpstreamsPath(),
    dryRun: args.includes('--dry-run'),
    only
  }, createDeps());

  if (results.some((result) => result.outcome === 'error')) {
    process.exitCode = 1;
  }
}

function createDeps(): SyncDeps {
  return {
    exec(file, args, env) {
      return toResult(spawnSync(file, args, { encoding: 'utf-8', env: { ...process.env, ...env } }));
    },
    async fetchJson(url) {
      const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
      const token = process.env['GITHUB_TOKEN'];
      if (token && url.startsWith('https://api.github.com/')) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`GET ${url} failed: HTTP ${String(response.status)}.`);
      }
      return await response.json() as unknown;
    },
    log(text) {
      process.stdout.write(`${text}\n`);
    },
    shell(command, env) {
      process.stdout.write(`> ${command}\n`);
      const result = toResult(spawnSync(command, { encoding: 'utf-8', env: { ...process.env, ...env }, shell: true }));
      process.stdout.write(result.output);
      return result;
    }
  };
}

function readOption(args: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function toResult(result: SpawnSyncReturns<string>): CommandResult {
  if (result.error) {
    return { exitCode: 1, output: result.error.message };
  }
  return { exitCode: result.status ?? 1, output: `${result.stdout}${result.stderr}` };
}
