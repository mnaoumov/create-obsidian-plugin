import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterAll,
  describe,
  expect,
  it
} from 'vitest';

import type { Answers } from './answers/answers.ts';

import { formatAnswersJson } from './answers/answers-export.ts';
import { CONFIG_FILE_NAME } from './answers/answers.ts';
import { parseCliArgs } from './answers/cli-args.ts';
import { OFFICIAL_SAMPLE_PRESET } from './features/preset/official-sample.ts';
import {
  applyOfficialSampleIdentity,
  copyOfficialSample,
  getUpstreamsPath,
  loadOfficialSampleSnapshot,
  OFFICIAL_SAMPLE_IDENTITY_FILES,
  OFFICIAL_SAMPLE_UPSTREAM_NAME
} from './official-sample.ts';
import { getDefaultAnswers } from './prompts/prompts.ts';
import { readUpstream } from './upstream-snapshot.ts';

type JsonObject = Record<string, unknown>;

const MANIFEST_IDENTITY_KEYS = ['author', 'authorUrl', 'description', 'fundingUrl', 'id', 'name'];

const tempDir = mkdtempSync(join(tmpdir(), 'cop-official-sample-'));

afterAll(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

const snapshot = loadOfficialSampleSnapshot();

function makeAnswers(overrides: Partial<Answers> = {}): Answers {
  return getDefaultAnswers({
    authorGitHubName: 'testuser',
    authorName: 'Test User',
    fundingPlatform: 'ko-fi',
    fundingUsername: 'testuser',
    pluginDescription: 'Does a thing.',
    pluginId: 'my-tool',
    pluginName: 'My Tool',
    preset: OFFICIAL_SAMPLE_PRESET,
    ...overrides
  });
}

function readJson(files: ReadonlyMap<string, Buffer>, path: string): JsonObject {
  return JSON.parse(files.get(path)?.toString('utf-8') ?? '{}') as JsonObject;
}

/** Serializes the way upstream does, so a reversed file can be compared byte for byte. */
function toUpstreamJson(json: JsonObject): Buffer {
  return Buffer.from(`${JSON.stringify(json, null, '\t')}\n`, 'utf-8');
}

describe('the vendored snapshot', () => {
  it('is pinned in upstreams.json, with a full commit SHA', () => {
    const upstream = readUpstream(getUpstreamsPath(), OFFICIAL_SAMPLE_UPSTREAM_NAME);
    expect(upstream.repo).toBe('obsidianmd/obsidian-sample-plugin');
    expect(upstream.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(snapshot.commit).toBe(upstream.commit);
  });

  it('carries every file the identity edits touch, and upstream\'s 0BSD license', () => {
    for (const path of OFFICIAL_SAMPLE_IDENTITY_FILES) {
      expect(snapshot.files.has(path), path).toBe(true);
    }
    expect(snapshot.files.get('LICENSE')?.toString('utf-8')).toContain('Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.');
  });

  // Re-serializing is only "as is" while upstream's JSON is exactly what `JSON.stringify` with a tab writes. If an
  // Upstream change breaks that, the identity edits would rewrite lines they never touched.
  it('holds JSON that re-serializes to the same bytes, so the identity edits touch nothing else', () => {
    for (const path of ['manifest.json', 'package.json', 'package-lock.json']) {
      expect(toUpstreamJson(readJson(snapshot.files, path)).equals(snapshot.files.get(path) ?? Buffer.alloc(0)), path).toBe(true);
    }
  });
});

describe('applyOfficialSampleIdentity', () => {
  const answers = makeAnswers();
  const generated = applyOfficialSampleIdentity(snapshot.files, answers);

  it('copies every file outside the identity set byte for byte', () => {
    expect([...generated.keys()]).toStrictEqual([...snapshot.files.keys()]);
    for (const [path, content] of snapshot.files) {
      if (!OFFICIAL_SAMPLE_IDENTITY_FILES.includes(path)) {
        expect(generated.get(path)?.equals(content), path).toBe(true);
      }
    }
  });

  it('fills in the manifest\'s identity fields', () => {
    expect(readJson(generated, 'manifest.json')).toMatchObject({
      author: 'Test User',
      authorUrl: 'https://github.com/testuser',
      description: 'Does a thing.',
      fundingUrl: 'https://ko-fi.com/testuser',
      id: 'my-tool',
      name: 'My Tool'
    });
  });

  it('names the package obsidian-<id> in package.json and both places package-lock.json names it', () => {
    expect(readJson(generated, 'package.json')['name']).toBe('obsidian-my-tool');
    const lock = readJson(generated, 'package-lock.json');
    expect(lock['name']).toBe('obsidian-my-tool');
    expect((lock['packages'] as Record<string, JsonObject>)['']?.['name']).toBe('obsidian-my-tool');
  });

  it('titles the README with the plugin name', () => {
    expect(generated.get('README.md')?.toString('utf-8').split('\n')[0]).toBe('# My Tool');
  });

  // The test the plan asks for: undo exactly the identity edits, and upstream's tree comes back exactly.
  it('gives the snapshot back exactly once the identity edits are reversed', () => {
    const reversed = new Map(generated);

    const upstreamManifest = readJson(snapshot.files, 'manifest.json');
    const manifest = readJson(generated, 'manifest.json');
    for (const key of MANIFEST_IDENTITY_KEYS) {
      manifest[key] = upstreamManifest[key];
    }
    reversed.set('manifest.json', toUpstreamJson(manifest));

    const upstreamName = readJson(snapshot.files, 'package.json')['name'];
    reversed.set('package.json', toUpstreamJson({ ...readJson(generated, 'package.json'), name: upstreamName }));
    const lock = readJson(generated, 'package-lock.json');
    const packages = lock['packages'] as Record<string, JsonObject>;
    reversed.set('package-lock.json', toUpstreamJson({ ...lock, name: upstreamName, packages: { ...packages, '': { ...packages[''], name: upstreamName } } }));

    const upstreamTitle = snapshot.files.get('README.md')?.toString('utf-8').split('\n')[0] ?? '';
    reversed.set('README.md', Buffer.from(generated.get('README.md')?.toString('utf-8').replace(/^.*$/m, upstreamTitle) ?? '', 'utf-8'));

    for (const [path, content] of snapshot.files) {
      expect(reversed.get(path)?.equals(content), path).toBe(true);
    }
  });

  it('drops upstream\'s fundingUrl when the answers link to no funding, and changes nothing else', () => {
    const manifest = readJson(applyOfficialSampleIdentity(snapshot.files, makeAnswers({ fundingPlatform: 'none' })), 'manifest.json');
    expect(manifest).not.toHaveProperty('fundingUrl');
    expect(Object.keys(manifest)).toStrictEqual(Object.keys(readJson(snapshot.files, 'manifest.json')).filter((key) => key !== 'fundingUrl'));
  });
});

describe('copyOfficialSample', () => {
  it('writes the project, records each file\'s hash and the upstream commit', () => {
    const targetDir = join(tempDir, 'create');
    const config = copyOfficialSample(makeAnswers(), targetDir, '1.2.3', null, snapshot);

    expect(config.upstreamCommit).toBe(snapshot.commit);
    expect(Object.keys(config.fileHashes).sort()).toStrictEqual([...snapshot.files.keys()].sort());
    expect(readFileSync(join(targetDir, '.gitignore')).equals(snapshot.files.get('.gitignore') ?? Buffer.alloc(0))).toBe(true);
    expect(existsSync(join(targetDir, CONFIG_FILE_NAME))).toBe(true);
  });

  it('skips a file the user edited when the project is updated', () => {
    const targetDir = join(tempDir, 'update');
    const answers = makeAnswers();
    const firstConfig = copyOfficialSample(answers, targetDir, '1.2.3', null, snapshot);
    writeFileSync(join(targetDir, 'src', 'main.ts'), '// mine\n');
    rmSync(join(targetDir, 'styles.css'));

    const secondConfig = copyOfficialSample(answers, targetDir, '1.2.4', firstConfig, snapshot);

    expect(readFileSync(join(targetDir, 'src', 'main.ts'), 'utf-8')).toBe('// mine\n');
    expect(secondConfig.fileHashes['src/main.ts']).toBe(firstConfig.fileHashes['src/main.ts']);
    expect(existsSync(join(targetDir, 'styles.css'))).toBe(true);
  });
});

describe('preset=official-sample on the command line', () => {
  it('is accepted as a preset, though it is outside the answer space', () => {
    expect(parseCliArgs([`--preset=${OFFICIAL_SAMPLE_PRESET}`]).answers.preset).toBe(OFFICIAL_SAMPLE_PRESET);
  });

  it('refuses a tooling answer beside it, naming the flag', () => {
    expect(() => parseCliArgs([`--preset=${OFFICIAL_SAMPLE_PRESET}`, '--linter=biome'])).toThrow(/--linter/);
  });

  it('takes an official-sample project\'s own config as an answers file, dropping the tooling answers it records', () => {
    const path = join(tempDir, 'saved-config.json');
    writeFileSync(path, JSON.stringify({ answers: { ...makeAnswers(), currentYear: undefined }, fileHashes: {} }));
    const { answers } = parseCliArgs([`--answersFile=${path}`]);
    expect(answers.preset).toBe(OFFICIAL_SAMPLE_PRESET);
    expect(answers.pluginId).toBe('my-tool');
    expect(answers.linter).toBeUndefined();
  });

  it('parses --latest', () => {
    expect(parseCliArgs(['--latest']).latest).toBe(true);
    expect(parseCliArgs([]).latest).toBe(false);
  });

  it('exports only the answers the preset reads, and the export parses back', () => {
    const exported = JSON.parse(formatAnswersJson(makeAnswers())) as Record<string, string>;
    expect(Object.keys(exported)).not.toContain('linter');
    expect(Object.keys(exported)).toContain('pluginId');

    const path = join(tempDir, 'exported.json');
    writeFileSync(path, JSON.stringify(exported));
    expect(parseCliArgs([`--answersFile=${path}`]).answers).toStrictEqual(exported);
  });
});
