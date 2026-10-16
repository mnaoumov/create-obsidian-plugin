import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  dirname,
  join,
  relative
} from 'node:path';
import process from 'node:process';

import type { UpstreamSnapshot } from '../src/upstream-snapshot.ts';

import { OFFICIAL_SAMPLE_PRESET } from '../src/features/preset/official-sample.ts';
import {
  copyOfficialSample,
  getUpstreamsPath,
  loadOfficialSampleSnapshot,
  OFFICIAL_SAMPLE_UPSTREAM_NAME
} from '../src/official-sample.ts';
import { getDefaultAnswers } from '../src/prompts.ts';
import {
  fetchUpstreamSnapshot,
  readUpstream
} from '../src/upstream-snapshot.ts';

interface EslintFileResult {
  filePath: string;
  messages: readonly EslintMessage[];
}

interface EslintMessage {
  column: number;
  line: number;
  message: string;
  ruleId: null | string;
}

await main();

/**
 * Holds the official sample to upstream's own scripts: a generated project and a pristine copy of the same upstream
 * tree each run `npm ci`, `npm run build` and `npm run lint`.
 *
 * The build has to pass. The lint is compared rather than required to pass, because upstream's own lint is red on
 * purpose: eslint-plugin-obsidianmd's `sample-names` and `no-sample-code` fail until the sample classes are renamed
 * and the sample code is removed. What the identity edits must not do is add a single finding, so the generated
 * project has to report exactly what upstream reports.
 *
 * `--latest` checks upstream's tree today instead of the vendored snapshot. Needs the network, and takes a minute or
 * two. `prepublishOnly` runs it.
 */
async function main(): Promise<void> {
  const keep = process.argv.includes('--keep');
  const root = mkdtempSync(join(tmpdir(), 'cop-official-sample-'));
  let failed = true;

  try {
    const snapshot = process.argv.includes('--latest') ? await fetchLatest() : loadOfficialSampleSnapshot();
    process.stdout.write(`Checking obsidianmd/obsidian-sample-plugin at ${snapshot.commit}\n`);

    const upstreamDir = join(root, 'upstream');
    for (const [path, content] of snapshot.files) {
      const fullPath = join(upstreamDir, path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content);
    }

    const generatedDir = join(root, 'obsidian-my-tool');
    copyOfficialSample(
      getDefaultAnswers({ authorGitHubName: 'testuser', authorName: 'Test User', pluginDescription: 'A generated plugin.', pluginId: 'my-tool', pluginName: 'My Tool', preset: OFFICIAL_SAMPLE_PRESET }),
      generatedDir,
      '0.0.0',
      null,
      snapshot
    );

    const upstreamLint = buildAndLint(upstreamDir);
    const generatedLint = buildAndLint(generatedDir);

    const added = generatedLint.filter((finding) => !upstreamLint.includes(finding));
    const missing = upstreamLint.filter((finding) => !generatedLint.includes(finding));
    if (added.length > 0 || missing.length > 0) {
      throw new Error([
        'The generated project does not lint as upstream does.',
        ...added.map((finding) => `  only in the generated project: ${finding}`),
        ...missing.map((finding) => `  only upstream: ${finding}`)
      ].join('\n'));
    }

    failed = false;
    process.stdout.write(`\nThe generated project installs and builds, and lints exactly as upstream does (${String(upstreamLint.length)} finding(s), the sample code upstream asks you to replace).\n`);
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

/** Installs and builds the project, then returns its lint findings, each as one comparable line. */
function buildAndLint(projectDir: string): string[] {
  run('npm ci --no-audit --no-fund', projectDir);
  run('npm run build', projectDir);

  const reportPath = join(projectDir, 'eslint-report.json');
  // The exit code is not the verdict here: upstream's own lint fails, and the findings are what is compared.
  process.stdout.write(`\n> npx eslint . --format json  (in ${projectDir})\n`);
  spawnSync(`npx eslint . --format json --output-file "${reportPath}"`, { cwd: projectDir, shell: true, stdio: 'inherit' });
  const report = JSON.parse(readFileSync(reportPath, 'utf-8')) as EslintFileResult[];
  rmSync(reportPath);

  return report.flatMap((file) => file.messages.map((message) => `${relative(projectDir, file.filePath).replaceAll('\\', '/')}:${String(message.line)}:${String(message.column)} ${message.ruleId ?? '(no rule)'} ${message.message}`)).sort();
}

async function fetchLatest(): Promise<UpstreamSnapshot> {
  const upstream = readUpstream(getUpstreamsPath(), OFFICIAL_SAMPLE_UPSTREAM_NAME);
  return await fetchUpstreamSnapshot(upstream.repo, upstream.ref);
}

function run(command: string, cwd: string): void {
  process.stdout.write(`\n> ${command}  (in ${cwd})\n`);
  const result = spawnSync(command, { cwd, shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Failed (${String(result.status)}): ${command}\n  in ${cwd}`);
  }
}
