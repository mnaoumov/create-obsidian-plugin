import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { Dependency } from '../src/template-builder.ts';
import {
  buildOverrides,
  buildPinnedVersionsJson,
  PINNED_VERSIONS,
  resolveVersions
} from '../src/versions.ts';

interface ParsedPin {
  check: null | string;
  expect?: string;
  manualCheck?: string;
  section: string;
  why: string;
}

interface ParsedPinnedVersions {
  pins: Record<string, ParsedPin>;
}

function stubRegistry(versions: Record<string, string>): void {
  vi.stubGlobal('fetch', (url: string) => {
    const packageName = decodeURIComponent(url.replace('https://registry.npmjs.org/', '').replace(/\/latest$/, ''));
    const version = versions[packageName];
    if (!version) {
      return Promise.resolve({ ok: false } as Response);
    }
    return Promise.resolve({
      json: () => Promise.resolve({ version }),
      ok: true
    } as Response);
  });
}

describe('resolveVersions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves an unconstrained package to a caret range', async () => {
    stubRegistry({ esbuild: '0.28.1' });
    const resolved = await resolveVersions([new Dependency('esbuild')]);
    expect(resolved.get('esbuild')).toBe('^0.28.1');
  });

  it('pins a package in the pin table instead of resolving it', async () => {
    // The registry answer is deliberately the one that breaks the build -- typescript 7 is outside
    // Typescript-eslint's peer range, which is the whole reason the pin exists.
    stubRegistry({ typescript: '7.0.2' });
    const resolved = await resolveVersions([new Dependency('typescript')]);
    expect(resolved.get('typescript')).toBe(PINNED_VERSIONS['typescript']?.version);
  });

  it('keeps an explicit version over both the pin table and the registry', async () => {
    stubRegistry({ typescript: '7.0.2' });
    const resolved = await resolveVersions([new Dependency('typescript', '5.9.2')]);
    expect(resolved.get('typescript')).toBe('5.9.2');
  });

  it('falls back to latest when the lookup fails', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    const resolved = await resolveVersions([new Dependency('esbuild')]);
    expect(resolved.get('esbuild')).toBe('latest');
  });

  it('resolves every dependency it is given', async () => {
    stubRegistry({ esbuild: '0.28.1', jiti: '2.7.0' });
    const resolved = await resolveVersions([new Dependency('esbuild'), new Dependency('jiti'), new Dependency('typescript')]);
    expect([...resolved.keys()].sort((a, b) => a.localeCompare(b))).toStrictEqual(['esbuild', 'jiti', 'typescript']);
  });
});

describe('buildOverrides', () => {
  it('overrides only the pins that need to reach nested copies', () => {
    const overrides = buildOverrides([new Dependency('typescript'), new Dependency('@codemirror/state'), new Dependency('@codemirror/language')]);
    expect(overrides).toStrictEqual({
      '@codemirror/state': '$@codemirror/state',
      'typescript': '$typescript'
    });
  });

  it('never overrides a package the project does not depend on', () => {
    // `@codemirror/*` is only present when the codemirror editor extensions are selected; an override for
    // An absent package makes npm resolve a package the project never asked for.
    const overrides = buildOverrides([new Dependency('typescript')]);
    expect(overrides).toStrictEqual({ typescript: '$typescript' });
  });
});

describe('buildPinnedVersionsJson', () => {
  it('emits an entry only for the pins actually present', () => {
    const parsed = JSON.parse(buildPinnedVersionsJson([new Dependency('typescript'), new Dependency('esbuild')])) as ParsedPinnedVersions;
    expect(Object.keys(parsed.pins)).toStrictEqual(['typescript']);
    expect(parsed.pins['typescript']?.section).toBe('devDependencies');
  });

  it('emits the mechanical check when the package it reads from is present', () => {
    const parsed = JSON.parse(buildPinnedVersionsJson([new Dependency('typescript'), new Dependency('typescript-eslint')])) as ParsedPinnedVersions;
    expect(parsed.pins['typescript']?.check).toContain('typescript-eslint');
    expect(parsed.pins['typescript']?.expect).toBe('>=4.8.4 <6.1.0');
  });

  it('falls back to the manual check when that package is absent', () => {
    // A biome project has no typescript-eslint, so the check command would just error -- G100 wants such a
    // Pin reported for manual review on every run, not silently carrying an unrunnable command.
    const parsed = JSON.parse(buildPinnedVersionsJson([new Dependency('typescript')])) as ParsedPinnedVersions;
    expect(parsed.pins['typescript']?.check).toBeNull();
    expect(parsed.pins['typescript']?.manualCheck).toBeTruthy();
  });
});
