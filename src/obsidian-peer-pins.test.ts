import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  describe,
  expect,
  it
} from 'vitest';

import {
  findStaleObsidianPeerPins,
  rewritePinnedVersion
} from './obsidian-peer-pins.ts';
import { PINNED_VERSIONS } from './versions.ts';

const VERSIONS_SOURCE = readFileSync(join(import.meta.dirname, 'versions.ts'), 'utf-8');
const STATE_VERSION = getPinnedVersion('@codemirror/state');
const VIEW_VERSION = getPinnedVersion('@codemirror/view');

describe('findStaleObsidianPeerPins', () => {
  it('finds nothing while the pins match the peers obsidian declares', () => {
    expect(findStaleObsidianPeerPins(PINNED_VERSIONS, { '@codemirror/state': STATE_VERSION, '@codemirror/view': VIEW_VERSION })).toEqual([]);
  });

  it('lists only the pins whose check reads an obsidian peer that moved', () => {
    const peers = { '@codemirror/state': '6.6.0', '@codemirror/view': VIEW_VERSION, 'moment': '9.9.9' };
    expect(findStaleObsidianPeerPins(PINNED_VERSIONS, peers)).toEqual([{ name: '@codemirror/state', peer: '6.6.0', pinned: STATE_VERSION }]);
  });
});

describe('rewritePinnedVersion', () => {
  it('moves the one pin\'s version and expect, and nothing else', () => {
    const rewritten = rewritePinnedVersion(VERSIONS_SOURCE, '@codemirror/state', '6.6.0');
    const originalLines = VERSIONS_SOURCE.split('\n');
    const changed = rewritten.split('\n').filter((line, index) => line !== originalLines[index]);
    expect(changed).toEqual(['    expect: \'6.6.0\',', '    version: \'6.6.0\',']);
    expect(rewritePinnedVersion(rewritten, '@codemirror/state', STATE_VERSION)).toBe(VERSIONS_SOURCE);
  });

  it('refuses a package with no pin', () => {
    expect(() => rewritePinnedVersion(VERSIONS_SOURCE, 'left-pad', '1.0.0')).toThrow('left-pad');
  });
});

function getPinnedVersion(name: string): string {
  const pin = PINNED_VERSIONS[name];
  if (!pin) {
    throw new Error(`No pin for ${name}.`);
  }
  return pin.version;
}
