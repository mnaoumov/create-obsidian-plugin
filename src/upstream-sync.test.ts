import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import type {
  CommandResult,
  GitUpstreamEntry,
  NpmUpstreamEntry,
  SyncDeps,
  UpstreamsConfig
} from './upstream-sync.ts';

import {
  buildPrBody,
  checkUpstream,
  parseUpstreamsConfig,
  planSync,
  syncUpstreams
} from './upstream-sync.ts';

const SHA_LENGTH = 40;
const SHORT_SHA_LENGTH = 12;
const PIN = 'a'.repeat(SHA_LENGTH);
const HEAD = 'b'.repeat(SHA_LENGTH);
const REPO = 'acme/upstream';
const COMPARE_FILE_LIMIT = 300;
const JSON_INDENT_SPACES = 2;
const CREATED_PR_NUMBER = 7;
const OPEN_PR_NUMBER = 12;
const HANDLER_EXIT_CODE = 2;
/** What git ls-remote --exit-code exits with when the branch does not exist. */
const NO_REMOTE_BRANCH_EXIT_CODE = 2;

const GIT_ENTRY: GitUpstreamEntry = { commit: PIN, handler: 'npm run sync:git', name: 'docs', paths: ['en/**/*.md'], ref: 'main', repo: REPO, verify: 'npm test' };
const NPM_ENTRY: NpmUpstreamEntry = { handler: 'npm run sync:npm', name: 'lib', npm: '@acme/lib', version: '1.0.0' };

const FIXTURE: UpstreamsConfig = {
  upstreams: [GIT_ENTRY, NPM_ENTRY],
  verify: 'npm run lint'
};

/** One file of a GitHub compare, as the API spells it. */
interface CompareFile {
  filename: string;

  previous_filename?: string;
}

interface FakeWorld {
  calls: string[];
  deps: SyncDeps;
  logs: string[];
}

interface FakeWorldOptions {
  /** Changed files the compare API reports. */
  compareFiles?: readonly CompareFile[];
  /** The handler's exit code. */
  handlerExitCode?: number;
  /** The open PR number `gh pr list` reports, or `''` for none. */
  openPr?: string;
  /** Whether `upstream/<name>` already exists on origin with this exact tree. */
  remoteBranchSame?: boolean;
}

/** Stands a fixture in for GitHub, npm, git and gh, recording every command run. */
function createFakeWorld(options: FakeWorldOptions = {}): FakeWorld {
  const calls: string[] = [];
  const logs: string[] = [];
  const deps: SyncDeps = {
    exec(file, args) {
      const line = `${file} ${args.join(' ')}`;
      calls.push(line);
      if (line.startsWith('git ls-remote')) {
        return { exitCode: options.remoteBranchSame === undefined ? NO_REMOTE_BRANCH_EXIT_CODE : 0, output: '' };
      }
      if (line.startsWith('git diff --quiet')) {
        return { exitCode: options.remoteBranchSame ? 0 : 1, output: '' };
      }
      if (line.startsWith('git diff --stat')) {
        return ok(' templates/x.md | 2 +-\n 1 file changed\n');
      }
      if (line.startsWith('gh pr list')) {
        return ok(`${options.openPr ?? ''}\n`);
      }
      if (line.startsWith('gh pr create')) {
        return ok(`https://github.com/me/repo/pull/${String(CREATED_PR_NUMBER)}\n`);
      }
      return ok();
    },
    fetchJson(url) {
      if (url === `https://api.github.com/repos/${REPO}/commits/main`) {
        return Promise.resolve({ sha: HEAD });
      }
      if (url === `https://api.github.com/repos/${REPO}/compare/${PIN}...${HEAD}`) {
        return Promise.resolve({ files: options.compareFiles ?? [{ filename: 'en/Plugins/Intro.md' }, { filename: 'README.md' }] });
      }
      if (url === 'https://registry.npmjs.org/@acme%2flib') {
        return Promise.resolve({ 'dist-tags': { latest: '1.0.0' } });
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    },
    log(text) {
      logs.push(text);
    },
    shell(command) {
      calls.push(`sh ${command}`);
      return command === 'npm run sync:git' && options.handlerExitCode !== undefined
        ? { exitCode: options.handlerExitCode, output: 'TS2304: Cannot find name \'Foo\'.\n' }
        : ok(`${command} ok\n`);
    }
  };
  return { calls, deps, logs };
}

function ok(output = ''): CommandResult {
  return { exitCode: 0, output };
}

let dir = '';
let configPath = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'upstream-sync-'));
  configPath = join(dir, 'upstreams.json');
  writeFileSync(configPath, `${JSON.stringify(FIXTURE, null, JSON_INDENT_SPACES)}\n`);
});

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

describe('parseUpstreamsConfig', () => {
  it('accepts the repository\'s own upstreams.json', () => {
    const config = parseUpstreamsConfig(readFileSync(join(import.meta.dirname, '..', 'upstreams.json'), 'utf-8'));
    expect(config.upstreams.map((entry) => entry.name)).toEqual(['obsidian-sample-plugin', 'obsidian-developer-docs', 'obsidian']);
  });

  it('refuses an entry without a handler, and a name used twice', () => {
    expect(() => parseUpstreamsConfig(JSON.stringify({ upstreams: [{ commit: PIN, name: 'x', paths: [], ref: 'main', repo: REPO }] }))).toThrow('"handler"');
    const entry = { handler: 'h', name: 'x', npm: 'x', version: '1.0.0' };
    expect(() => parseUpstreamsConfig(JSON.stringify({ upstreams: [entry, entry] }))).toThrow('used twice');
  });
});

describe('checkUpstream', () => {
  it('keeps only the watched paths a move changed, including a rename\'s old path', async () => {
    // eslint-disable-next-line camelcase -- The GitHub API's name.
    const renamed: CompareFile = { filename: 'docs/New.md', previous_filename: 'en/Old.md' };
    const { deps } = createFakeWorld({ compareFiles: [renamed, { filename: 'en/A.md' }] });
    const status = await checkUpstream(GIT_ENTRY, deps);
    expect(status.state).toBe('moved');
    expect(status.changedPaths).toEqual(['en/A.md', 'en/Old.md']);
    expect(status.compareUrl).toBe(`https://github.com/${REPO}/compare/${PIN}...${HEAD}`);
  });

  it('reports a move that touched no watched path as unwatched', async () => {
    const { deps } = createFakeWorld({ compareFiles: [{ filename: 'README.md' }] });
    expect((await checkUpstream(GIT_ENTRY, deps)).state).toBe('unwatched');
  });

  it('treats a truncated compare as moved, because a watched path may be past the limit', async () => {
    const files = Array.from({ length: COMPARE_FILE_LIMIT }, (_, index) => ({ filename: `other/${String(index)}.txt` }));
    const status = await checkUpstream(GIT_ENTRY, createFakeWorld({ compareFiles: files }).deps);
    expect(status.state).toBe('moved');
    expect(status.truncated).toBe(true);
  });

  it('follows an npm dist-tag', async () => {
    const status = await checkUpstream(NPM_ENTRY, createFakeWorld().deps);
    expect(status).toMatchObject({ head: '1.0.0', pin: '1.0.0', state: 'current' });
  });
});

describe('syncUpstreams', () => {
  it('prints the PR a fixture upstream behind its pin asks for, and runs nothing, in a dry run', async () => {
    const world = createFakeWorld();
    const results = await syncUpstreams({ baseBranch: 'main', configPath, dryRun: true, only: [] }, world.deps);

    expect(results).toEqual([{ name: 'docs', outcome: 'planned' }, { name: 'lib', outcome: 'current' }]);
    expect(world.calls).toEqual([]);
    const output = world.logs.join('\n');
    expect(output).toContain('Would push upstream/docs');
    expect(output).toContain(`title: chore(upstream): sync docs to ${HEAD.slice(0, SHORT_SHA_LENGTH)}`);
    expect(output).toContain(`  | Upstream \`docs\` moved: \`${REPO}@main\` from \`${PIN}\` to \`${HEAD}\`.`);
    expect(output).toContain('  | - `en/Plugins/Intro.md`');
    expect(output).not.toContain('README.md');
    expect(output).toContain('`npm run sync:git`: not run (dry run).');
    expect(readFileSync(configPath, 'utf-8')).toContain(PIN);
  });

  it('runs the handler and verify, pins the head, and opens a PR', async () => {
    const world = createFakeWorld();
    const results = await syncUpstreams({ baseBranch: 'main', configPath, dryRun: false, only: ['docs'] }, world.deps);

    expect(results).toEqual([{ name: 'docs', outcome: 'opened', prNumber: CREATED_PR_NUMBER }]);
    const firstCalls = [
      'git status --porcelain',
      'git fetch origin main',
      'git checkout -B upstream/docs origin/main',
      'sh npm run sync:git',
      'sh npm test'
    ];
    expect(world.calls.slice(0, firstCalls.length)).toEqual(firstCalls);
    expect(world.calls).toContain('git push --force origin HEAD:refs/heads/upstream/docs');
    const create = world.calls.find((call) => call.startsWith('gh pr create')) ?? '';
    expect(create).not.toContain('--draft');
    expect(create).toContain('### Generated changes');
    const lastCalls = ['git checkout --force main', 'git branch --delete --force upstream/docs'];
    expect(world.calls.slice(-lastCalls.length)).toEqual(lastCalls);
    expect(readFileSync(configPath, 'utf-8')).toContain(HEAD);
  });

  it('opens a draft carrying the failure when the handler fails', async () => {
    const world = createFakeWorld({ handlerExitCode: HANDLER_EXIT_CODE });
    await syncUpstreams({ baseBranch: 'main', configPath, dryRun: false, only: ['docs'] }, world.deps);

    const create = world.calls.find((call) => call.startsWith('gh pr create')) ?? '';
    expect(create).toContain('--draft');
    expect(create).toContain(`\`npm run sync:git\`: **FAILED** (exit ${String(HANDLER_EXIT_CODE)}).`);
    expect(create).toContain('TS2304');
  });

  it('updates the open PR, and turns it back into a draft when a step fails', async () => {
    const world = createFakeWorld({ handlerExitCode: 1, openPr: String(OPEN_PR_NUMBER), remoteBranchSame: false });
    const results = await syncUpstreams({ baseBranch: 'main', configPath, dryRun: false, only: ['docs'] }, world.deps);

    expect(results).toEqual([{ name: 'docs', outcome: 'updated', prNumber: OPEN_PR_NUMBER }]);
    expect(world.calls).toContain(`gh pr ready ${String(OPEN_PR_NUMBER)} --undo`);
    expect(world.calls.some((call) => call.startsWith('gh pr create'))).toBe(false);
  });

  it('pushes nothing when the update branch already holds the same result', async () => {
    const world = createFakeWorld({ remoteBranchSame: true });
    const results = await syncUpstreams({ baseBranch: 'main', configPath, dryRun: false, only: ['docs'] }, world.deps);

    expect(results).toEqual([{ name: 'docs', outcome: 'unchanged' }]);
    expect(world.calls.some((call) => call.startsWith('git push'))).toBe(false);
  });

  it('refuses to commit over a dirty working tree, and goes on to the next entry', async () => {
    const world = createFakeWorld();
    const exec = world.deps.exec.bind(world.deps);
    world.deps.exec = (file, args, env): CommandResult => args[0] === 'status' ? { exitCode: 0, output: '?? stray.txt\n' } : exec(file, args, env);
    const results = await syncUpstreams({ baseBranch: 'main', configPath, dryRun: false, only: [] }, world.deps);

    expect(results[0]).toMatchObject({ name: 'docs', outcome: 'error' });
    expect(results[0]?.error).toContain('stray.txt');
    expect(results[1]).toEqual({ name: 'lib', outcome: 'current' });
  });

  it('refuses an --only name that is not in the file', async () => {
    await expect(syncUpstreams({ baseBranch: 'main', configPath, dryRun: true, only: ['nope'] }, createFakeWorld().deps)).rejects.toThrow('"nope"');
  });
});

describe('buildPrBody', () => {
  it('describes an npm upstream by its package and tag', async () => {
    const status = await checkUpstream({ ...NPM_ENTRY, version: '0.9.0' }, createFakeWorld().deps);
    const body = buildPrBody(planSync(status), null, null);
    expect(body).toContain('npm `@acme/lib@latest` from `0.9.0` to `1.0.0`');
    expect(body).toContain('https://www.npmjs.com/package/@acme/lib/v/1.0.0');
    expect(body).not.toContain('### Changed upstream files');
  });
});
