import { execSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import {
  findStaleObsidianPeerPins,
  rewritePinnedVersion
} from '../src/obsidian-peer-pins.ts';
import {
  getPackageRoot,
  getUpstreamsPath
} from '../src/official-sample.ts';
import { PINNED_VERSIONS } from '../src/versions.ts';

interface UpstreamEntry {
  name: string;
  version?: string;
}

interface UpstreamsFile {
  upstreams: UpstreamEntry[];
}

const JSON_INDENT_SPACES = 2;

/** The `upstreams.json` entry that follows the `obsidian` package. */
const OBSIDIAN_UPSTREAM_NAME = 'obsidian';

interface NpmVersionManifest {
  peerDependencies?: Record<string, string>;
  version: string;
}

await main();

/**
 * Moves the scaffolder to a new `obsidian` release.
 *
 * It is the `obsidian` entry's `handler` in `upstreams.json`, and runnable by hand. Generated projects resolve
 * `obsidian` itself at generation time, so what has to move here is what is held to it: the pins in `src/versions.ts`
 * that follow obsidian's own peer dependencies, and the docs showcase, which is type-checked against one `obsidian`
 * version. The showcase is regenerated from the pinned docs commit, so this change carries the API move alone.
 *
 * The version is `UPSTREAM_TARGET` when the upstream-sync job sets it, otherwise the latest on npm.
 */
async function main(): Promise<void> {
  const target = process.env['UPSTREAM_TARGET'] ?? 'latest';
  const response = await fetch(`https://registry.npmjs.org/obsidian/${target}`);
  if (!response.ok) {
    throw new Error(`Could not read obsidian@${target} from npm: HTTP ${String(response.status)}.`);
  }
  const manifest = await response.json() as NpmVersionManifest;
  process.stdout.write(`Moving to obsidian ${manifest.version}.\n`);

  const versionsPath = join(getPackageRoot(), 'src', 'versions.ts');
  let source = readFileSync(versionsPath, 'utf-8');
  const stale = findStaleObsidianPeerPins(PINNED_VERSIONS, manifest.peerDependencies ?? {});
  for (const pin of stale) {
    source = rewritePinnedVersion(source, pin.name, pin.peer);
    process.stdout.write(`  ${pin.name}: ${pin.pinned} -> ${pin.peer}, the version obsidian ${manifest.version} peers on.\n`);
  }
  if (stale.length > 0) {
    writeFileSync(versionsPath, source);
    process.stdout.write('  Check the pins that move with these by hand, such as @codemirror/language.\n');
  } else {
    process.stdout.write('  The pinned peers already match.\n');
  }

  execSync('npm run sync:docs-showcase -- --pinned-docs', { cwd: getPackageRoot(), stdio: 'inherit' });

  const upstreamsPath = getUpstreamsPath();
  const upstreams = JSON.parse(readFileSync(upstreamsPath, 'utf-8')) as UpstreamsFile;
  for (const entry of upstreams.upstreams) {
    if (entry.name === OBSIDIAN_UPSTREAM_NAME) {
      entry.version = manifest.version;
    }
  }
  writeFileSync(upstreamsPath, `${JSON.stringify(upstreams, null, JSON_INDENT_SPACES)}\n`);
}
