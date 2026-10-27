import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import {
  dirname,
  join
} from 'node:path';
import process from 'node:process';

import {
  getPackageRoot,
  getUpstreamsPath,
  OFFICIAL_SAMPLE_FILES_DIR,
  OFFICIAL_SAMPLE_UPSTREAM_NAME
} from '../src/official-sample.ts';
import {
  fetchUpstreamSnapshot,
  readUpstream,
  readVendoredFiles,
  VENDORED_SUFFIX
} from '../src/upstream-snapshot.ts';

interface UpstreamEntry {
  commit: string;
  name: string;
}

interface UpstreamsFile {
  upstreams: UpstreamEntry[];
}

const JSON_INDENT_SPACES = 2;

await main();

/**
 * Refreshes the vendored snapshot of obsidianmd/obsidian-sample-plugin and its pin in `upstreams.json`.
 *
 * It is that entry's `handler`, which is what the upstream-sync job runs when upstream moves, and it is runnable by
 * hand. `--check` writes nothing and exits 1 when upstream has moved past the pin or the snapshot differs from the
 * pinned commit's tree.
 */
async function main(): Promise<void> {
  const isCheck = process.argv.includes('--check');
  const upstreamsPath = getUpstreamsPath();
  const upstream = readUpstream(upstreamsPath, OFFICIAL_SAMPLE_UPSTREAM_NAME);
  const filesDir = join(getPackageRoot(), OFFICIAL_SAMPLE_FILES_DIR);

  const snapshot = await fetchUpstreamSnapshot(upstream.repo, upstream.ref);
  const vendored = readVendoredFiles(filesDir);
  const changed = [...snapshot.files].filter(([path, content]) => !vendored.get(path)?.equals(content)).map(([path]) => path);
  const removed = [...vendored.keys()].filter((path) => !snapshot.files.has(path));
  const isPinCurrent = upstream.commit === snapshot.commit;

  if (isPinCurrent && changed.length === 0 && removed.length === 0) {
    process.stdout.write(`${upstream.repo}@${upstream.ref} is still ${snapshot.commit}, and the snapshot matches it.\n`);
    return;
  }

  process.stdout.write(`${upstream.repo}@${upstream.ref}: pinned ${upstream.commit}, upstream ${snapshot.commit}.\n`);
  for (const path of changed) {
    process.stdout.write(`  ${vendored.has(path) ? 'changed' : 'added'}: ${path}\n`);
  }
  for (const path of removed) {
    process.stdout.write(`  removed: ${path}\n`);
  }

  if (isCheck) {
    process.stdout.write('Run `npm run sync:official-sample` to refresh the snapshot.\n');
    process.exitCode = 1;
    return;
  }

  for (const path of changed) {
    const fullPath = join(filesDir, `${path}${VENDORED_SUFFIX}`);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, snapshot.files.get(path) ?? Buffer.alloc(0));
  }
  for (const path of removed) {
    rmSync(join(filesDir, `${path}${VENDORED_SUFFIX}`));
  }

  const upstreams = JSON.parse(readFileSync(upstreamsPath, 'utf-8')) as UpstreamsFile;
  for (const entry of upstreams.upstreams) {
    if (entry.name === OFFICIAL_SAMPLE_UPSTREAM_NAME) {
      entry.commit = snapshot.commit;
    }
  }
  writeFileSync(upstreamsPath, `${JSON.stringify(upstreams, null, JSON_INDENT_SPACES)}\n`);
  process.stdout.write(`Vendored ${upstream.repo}@${snapshot.commit} into ${OFFICIAL_SAMPLE_FILES_DIR}.\n`);
}
