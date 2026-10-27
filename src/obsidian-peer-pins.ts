import type { PinnedVersion } from './versions.ts';

/** The pin and the peer range `obsidian` now declares for one package, where the two disagree. */
export interface StalePeerPin {
  readonly name: string;
  readonly peer: string;
  readonly pinned: string;
}

const PEER_CHECK_PATTERN = /require\('obsidian\/package\.json'\)\.peerDependencies\['(?<Name>[^']+)'\]/;

/**
 * Lists the pins that follow a peer dependency of `obsidian` and no longer match it.
 *
 * A pin follows a peer when its `check` prints that peer out of `obsidian/package.json`, which is what makes it
 * safe to move mechanically: the pin exists only to agree with that one value.
 *
 * @param pins - The pin table.
 * @param peers - The `peerDependencies` of the `obsidian` release being moved to.
 * @returns The stale pins, sorted by name.
 */
export function findStaleObsidianPeerPins(pins: Readonly<Record<string, PinnedVersion>>, peers: Readonly<Record<string, string>>): StalePeerPin[] {
  const stale: StalePeerPin[] = [];
  for (const [name, pin] of Object.entries(pins)) {
    const peerName = PEER_CHECK_PATTERN.exec(pin.check ?? '')?.groups?.['Name'];
    const peer = peerName === undefined ? undefined : peers[peerName];
    if (peer !== undefined && (pin.expect !== peer || pin.version !== peer)) {
      stale.push({ name, peer, pinned: pin.version });
    }
  }
  return stale.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Rewrites one pin's `version` and `expect` in the source of `versions.ts`, leaving everything else as it is.
 *
 * @param source - The source of `versions.ts`.
 * @param name - The pinned package.
 * @param version - The new version, used for both fields.
 * @returns The rewritten source.
 */
export function rewritePinnedVersion(source: string, name: string, version: string): string {
  const start = source.indexOf(`  '${name}': {\n`);
  if (start === -1) {
    throw new Error(`versions.ts has no pin for ${name}.`);
  }
  const end = source.indexOf('\n  }', start);
  const block = source.slice(start, end)
    .replace(/^(?<Indent> {4}expect: )'[^']*'/m, `$<Indent>'${version}'`)
    .replace(/^(?<Indent> {4}version: )'[^']*'/m, `$<Indent>'${version}'`);
  return `${source.slice(0, start)}${block}${source.slice(end)}`;
}
