import {
  existsSync,
  readdirSync,
  readFileSync
} from 'node:fs';
import {
  join,
  relative
} from 'node:path';

/** One upstream repository the scaffolder mirrors, as `upstreams.json` records it. */
export interface Upstream {
  /** The pinned commit the vendored snapshot was taken at. */
  commit: string;
  /** The command that refreshes the vendored copy from a newer upstream state. */
  handler: string;
  name: string;
  /** The paths watched upstream, as globs relative to the repository root. */
  paths: readonly string[];
  /** The branch or tag followed. */
  ref: string;
  /** `<owner>/<repo>` on GitHub. */
  repo: string;
}

/** A tree of files at one upstream commit, keyed by the path relative to the repository root. */
export interface UpstreamSnapshot {
  commit: string;
  files: ReadonlyMap<string, Buffer>;
}

interface GitHubCommitResponse {
  sha: string;
}

interface GitHubTreeEntry {
  mode: string;
  path: string;
  type: string;
}

interface GitHubTreeResponse {
  tree: readonly GitHubTreeEntry[];
  truncated: boolean;
}

interface UpstreamsFile {
  upstreams: readonly Upstream[];
}

/**
 * The suffix every vendored file carries on disk.
 *
 * Without it the snapshot would act on this repository: its `.gitignore` would ignore files here, npm never
 * packs a `.gitignore` or an `.npmrc` under its own name, and an agent tool would read its `AGENTS.md` as
 * instructions for this repository.
 */
export const VENDORED_SUFFIX = '.vendored';

/** A regular file in a git tree. Symlinks (`120000`) and submodules (`160000`) are not files to copy. */
const REGULAR_FILE_MODES: ReadonlySet<string> = new Set(['100644', '100755']);

/**
 * Fetches every regular file of `repo` at `ref`, byte for byte, through the GitHub API.
 *
 * The tree comes from the API and each blob from `raw.githubusercontent.com`, which serves the committed bytes
 * with no line-ending conversion. `GITHUB_TOKEN` is used when set, so a CI job is not held to the anonymous rate
 * limit.
 *
 * @param repo - `<owner>/<repo>`.
 * @param ref - The branch, tag or commit to read.
 * @returns The commit `ref` resolved to and its files.
 */
export async function fetchUpstreamSnapshot(repo: string, ref: string): Promise<UpstreamSnapshot> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  const token = process.env['GITHUB_TOKEN'];
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const commit = await fetchJson<GitHubCommitResponse>(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`, headers);
  const tree = await fetchJson<GitHubTreeResponse>(`https://api.github.com/repos/${repo}/git/trees/${commit.sha}?recursive=1`, headers);
  if (tree.truncated) {
    throw new Error(`The tree of ${repo}@${commit.sha} is too large for one API response.`);
  }

  const paths = tree.tree.filter((entry) => entry.type === 'blob' && REGULAR_FILE_MODES.has(entry.mode)).map((entry) => entry.path);
  const contents = await Promise.all(paths.map(async (path) => {
    const response = await fetch(`https://raw.githubusercontent.com/${repo}/${commit.sha}/${path.split('/').map(encodeURIComponent).join('/')}`);
    if (!response.ok) {
      throw new Error(`Could not download ${path} from ${repo}@${commit.sha}: HTTP ${String(response.status)}.`);
    }
    return Buffer.from(await response.arrayBuffer());
  }));

  return {
    commit: commit.sha,
    files: new Map(paths.map((path, index) => [path, contents[index] ?? Buffer.alloc(0)]))
  };
}

/**
 * Reads the upstream named `name` out of an `upstreams.json`.
 *
 * @param upstreamsPath - The path to `upstreams.json`.
 * @param name - The entry's `name`.
 * @returns The entry.
 */
export function readUpstream(upstreamsPath: string, name: string): Upstream {
  const parsed = JSON.parse(readFileSync(upstreamsPath, 'utf-8')) as UpstreamsFile;
  const upstream = parsed.upstreams.find((candidate) => candidate.name === name);
  if (!upstream) {
    throw new Error(`${upstreamsPath} has no upstream named "${name}".`);
  }
  return upstream;
}

/**
 * Reads a vendored snapshot back off disk: every file under `dir` carrying {@link VENDORED_SUFFIX}, keyed by its
 * upstream path.
 *
 * @param dir - The folder the snapshot was vendored into.
 * @returns The files, keyed by their path upstream, in sorted order.
 */
export function readVendoredFiles(dir: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  if (!existsSync(dir)) {
    return files;
  }

  const paths = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(VENDORED_SUFFIX))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
  for (const fullPath of paths) {
    const upstreamPath = relative(dir, fullPath).replaceAll('\\', '/').slice(0, -VENDORED_SUFFIX.length);
    files.set(upstreamPath, readFileSync(fullPath));
  }
  return files;
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: HTTP ${String(response.status)}.`);
  }
  return await response.json() as T;
}
