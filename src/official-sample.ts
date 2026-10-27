import { join } from 'node:path';

import type {
  Answers,
  GeneratorConfig
} from './answers/answers.ts';
import type { UpstreamSnapshot } from './upstream-snapshot.ts';

import { resolveFunding } from './features/funding-platform/index.ts';
import {
  getScriptDir,
  writeGeneratedFiles
} from './templates.ts';
import {
  readUpstream,
  readVendoredFiles
} from './upstream-snapshot.ts';

/** The `upstreams.json` entry for obsidianmd/obsidian-sample-plugin. */
export const OFFICIAL_SAMPLE_UPSTREAM_NAME = 'obsidian-sample-plugin';

/** Where the snapshot is vendored, relative to the repository root. */
export const OFFICIAL_SAMPLE_FILES_DIR = join('templates', 'official-sample', 'files');

/**
 * The two tooling answers the generator itself reads after scaffolding, pinned to what upstream has: no formatter
 * (so no initial `format` runs) and npm (upstream ships a `package-lock.json`, and its CI runs `npm ci`).
 */
export const OFFICIAL_SAMPLE_PINNED_ANSWERS: Readonly<Pick<Answers, 'formatter' | 'packageManager'>> = {
  formatter: 'none',
  packageManager: 'npm'
};

/** A JSON object as the identity edits see it: the key order is kept, so a re-serialized file stays upstream's. */
type JsonObject = Record<string, unknown>;

/**
 * The files the identity edits touch. Everything else in the snapshot is copied byte for byte.
 *
 * `package-lock.json` is here because it repeats the package name twice, and a lockfile naming another package
 * is what `npm install` rewrites on its first run -- a diff in a project nobody has touched yet.
 */
export const OFFICIAL_SAMPLE_IDENTITY_FILES: readonly string[] = ['manifest.json', 'package.json', 'package-lock.json', 'README.md'];

/**
 * The official sample, filled in with these answers: the identity edits applied to every file of the snapshot.
 *
 * - `manifest.json`: `id`, `name`, `description`, `author`, `authorUrl` (the GitHub profile) and `fundingUrl`,
 *   which is removed when the answers link to no funding -- upstream's points at Obsidian's own pricing page.
 * - `package.json` and the two names in `package-lock.json`: the package name, `obsidian-<id>`.
 * - `README.md`: the first `# ` heading becomes the plugin's name.
 *
 * Each JSON file is re-serialized with the indentation and final newline it came with, which leaves every untouched
 * line as upstream wrote it: upstream's JSON is exactly what `JSON.stringify` with a tab produces.
 *
 * @param files - The snapshot, keyed by path.
 * @param answers - The answers.
 * @returns The files to write, in the snapshot's order.
 */
export function applyOfficialSampleIdentity(files: ReadonlyMap<string, Buffer>, answers: Answers): Map<string, Buffer> {
  const packageName = `obsidian-${answers.pluginId}`;
  const result = new Map(files);

  editJson(result, 'manifest.json', (manifest) => {
    const fundingUrl = resolveFunding(answers)?.getUrl(answers);
    const edited: JsonObject = {};
    for (const [key, value] of Object.entries(manifest)) {
      switch (key) {
        case 'author':
          edited[key] = answers.authorName;
          break;
        case 'authorUrl':
          edited[key] = `https://github.com/${answers.authorGitHubName}`;
          break;
        case 'description':
          edited[key] = answers.pluginDescription;
          break;
        case 'fundingUrl':
          if (fundingUrl) {
            edited[key] = fundingUrl;
          }
          break;
        case 'id':
          edited[key] = answers.pluginId;
          break;
        case 'name':
          edited[key] = answers.pluginName;
          break;
        default:
          edited[key] = value;
      }
    }
    return edited;
  });

  const upstreamPackageName = readUpstreamPackageName(files);
  editJson(result, 'package.json', (packageJson) => ({ ...packageJson, name: packageName }));
  editJson(result, 'package-lock.json', (lock) => renamePackageInLock(lock, upstreamPackageName, packageName));

  const readme = result.get('README.md');
  if (readme) {
    result.set('README.md', Buffer.from(readme.toString('utf-8').replace(/^# .*$/m, `# ${answers.pluginName}`), 'utf-8'));
  }

  return result;
}

/**
 * Writes the official sample into a project, through the same hash-recording writer as the templates, so an
 * update skips every file the user has edited -- `manifest.json` included, once `npm version` has bumped it.
 *
 * @param answers - The answers.
 * @param targetDir - The project directory.
 * @param currentVersion - The generator's version.
 * @param existingConfig - The previous generation's config, or `null` when creating.
 * @param snapshot - The upstream tree to copy: the vendored one, or upstream's latest under `--latest`.
 * @returns The new config, recording the upstream commit the project was copied from.
 */
export function copyOfficialSample(
  answers: Answers,
  targetDir: string,
  currentVersion: string,
  existingConfig: GeneratorConfig | null,
  snapshot: UpstreamSnapshot
): GeneratorConfig {
  const files = applyOfficialSampleIdentity(snapshot.files, answers);
  const config = writeGeneratedFiles(
    [...files].map(([destinationPath, content]) => ({ content, destinationPath })),
    targetDir,
    currentVersion,
    existingConfig
  );
  return { ...config, upstreamCommit: snapshot.commit };
}

/**
 * The repository root: `src/` when run from source, `dist/` when installed, and the package root above either.
 */
export function getPackageRoot(): string {
  return join(getScriptDir(), '..');
}

/** The `upstreams.json` that pins every vendored upstream, shipped in the package. */
export function getUpstreamsPath(): string {
  return join(getPackageRoot(), 'upstreams.json');
}

/**
 * The vendored snapshot of obsidianmd/obsidian-sample-plugin, at the commit `upstreams.json` pins.
 *
 * @returns The snapshot.
 */
export function loadOfficialSampleSnapshot(): UpstreamSnapshot {
  const upstream = readUpstream(getUpstreamsPath(), OFFICIAL_SAMPLE_UPSTREAM_NAME);
  const files = readVendoredFiles(join(getPackageRoot(), OFFICIAL_SAMPLE_FILES_DIR));
  if (files.size === 0) {
    throw new Error(`The vendored snapshot of ${upstream.repo} is missing from ${OFFICIAL_SAMPLE_FILES_DIR}.`);
  }
  return { commit: upstream.commit, files };
}

function editJson(files: Map<string, Buffer>, path: string, edit: (json: JsonObject) => JsonObject): void {
  const content = files.get(path);
  if (!content) {
    return;
  }

  const text = content.toString('utf-8');
  const indent = /^\{\r?\n(?<Indent>[ \t]+)/.exec(text)?.groups?.['Indent'] ?? '\t';
  const finalNewline = /\r?\n$/.exec(text)?.[0] ?? '';
  const edited = edit(JSON.parse(text) as JsonObject);
  files.set(path, Buffer.from(`${JSON.stringify(edited, null, indent)}${finalNewline}`, 'utf-8'));
}

function readUpstreamPackageName(files: ReadonlyMap<string, Buffer>): string | undefined {
  const content = files.get('package.json');
  if (!content) {
    return undefined;
  }
  const name = (JSON.parse(content.toString('utf-8')) as JsonObject)['name'];
  return typeof name === 'string' ? name : undefined;
}

/**
 * The lockfile with upstream's package name replaced: once at the top, once on the root package entry (`""`).
 */
function renamePackageInLock(lock: JsonObject, upstreamName: string | undefined, packageName: string): JsonObject {
  const renamed: JsonObject = { ...lock };
  if (renamed['name'] === upstreamName) {
    renamed['name'] = packageName;
  }

  const packages = renamed['packages'];
  if (typeof packages === 'object' && packages !== null) {
    const root = (packages as JsonObject)[''];
    if (typeof root === 'object' && root !== null && (root as JsonObject)['name'] === upstreamName) {
      renamed['packages'] = { ...packages as JsonObject, '': { ...root as JsonObject, name: packageName } };
    }
  }

  return renamed;
}
