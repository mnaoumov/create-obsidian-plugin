import { subset } from 'semver';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { Dependency } from './template-builder.ts';
import {
  buildOverrides,
  buildPinnedVersionsJson,
  buildResolutions,
  PINNED_VERSIONS,
  resolveVersions
} from './versions.ts';

interface ParsedPin {
  readonly check: null | string;
  readonly expect?: string;
  readonly manualCheck?: string;
  readonly section: string;
  readonly why: string;
}

interface ParsedPinnedVersions {
  readonly pins: Record<string, ParsedPin>;
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

describe('resolveVersions under the toolkits\' own ranges', () => {
  const OBSIDIAN_DEV_TOOLKIT = '@mnaoumov/obsidian-dev-toolkit';
  const TYPESCRIPT_DEV_TOOLKIT = '@mnaoumov/typescript-dev-toolkit';

  interface FakeManifest {
    readonly dependencies?: Record<string, string>;
    readonly peerDependencies?: Record<string, string>;
  }

  interface FakePackage {
    readonly latest: string;
    readonly manifests?: Record<string, FakeManifest>;
    readonly versions: readonly string[];
  }

  // The shape of 2026-10-30: typescript-dev-toolkit 6.0.0 is out, obsidian-dev-toolkit 7.4.0 still declares ^5.4.0.
  const SKEWED_REGISTRY: Record<string, FakePackage> = {
    '@mnaoumov/obsidian-dev-toolkit': {
      latest: '7.4.0',
      manifests: {
        '7.4.0': {
          dependencies: { '@mnaoumov/typescript-dev-toolkit': '^5.4.0', '@mnaoumov/typescript-lib': '^1.0.0 || ^2.0.0' },
          peerDependencies: { vitest: '^5.0.1' }
        }
      },
      versions: ['7.3.0', '7.4.0']
    },
    '@mnaoumov/typescript-dev-toolkit': {
      latest: '6.0.0',
      manifests: { '5.4.2': { peerDependencies: { eslint: '^10.0.0' } } },
      versions: ['5.4.0', '5.4.1', '5.4.2', '6.0.0']
    },
    '@mnaoumov/typescript-lib': { latest: '2.1.0', versions: ['1.0.0', '2.0.0', '2.1.0'] },
    'esbuild': { latest: '0.28.1', versions: ['0.28.1'] },
    'eslint': { latest: '11.0.0', versions: ['9.0.0', '10.12.0', '11.0.0'] },
    'vitest': { latest: '6.0.0', versions: ['5.0.1', '5.0.7', '6.0.0'] }
  };

  function stubPackages(packages: Record<string, FakePackage>): void {
    vi.stubGlobal('fetch', (url: string) => {
      const path = decodeURIComponent(url.replace('https://registry.npmjs.org/', ''));
      const packageName = Object.keys(packages).find((name) => path === name || path.startsWith(`${name}/`));
      const fakePackage = packageName === undefined ? undefined : packages[packageName];
      if (packageName === undefined || fakePackage === undefined) {
        return Promise.resolve({ ok: false } as Response);
      }
      const rest = path.slice(packageName.length + 1);
      let body: unknown;
      if (rest === 'latest') {
        body = { version: fakePackage.latest };
      } else if (rest === '') {
        body = { versions: Object.fromEntries(fakePackage.versions.map((version) => [version, {}])) };
      } else {
        body = fakePackage.manifests?.[rest] ?? {};
      }
      return Promise.resolve({ json: () => Promise.resolve(body), ok: true } as Response);
    });
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('holds typescript-dev-toolkit inside the range obsidian-dev-toolkit declares', async () => {
    stubPackages(SKEWED_REGISTRY);
    const resolved = await resolveVersions([new Dependency(TYPESCRIPT_DEV_TOOLKIT), new Dependency(OBSIDIAN_DEV_TOOLKIT)]);
    const toolkitRange = SKEWED_REGISTRY[OBSIDIAN_DEV_TOOLKIT]?.manifests?.['7.4.0']?.dependencies?.[TYPESCRIPT_DEV_TOOLKIT] ?? '';
    const emitted = resolved.get(TYPESCRIPT_DEV_TOOLKIT) ?? '';
    expect(emitted).toBe('^5.4.2');
    // The property that matters, whatever the numbers: every version the emitted spec admits is one
    // Obsidian-dev-toolkit accepts, so npm can never install a second copy for it.
    expect(subset(emitted, toolkitRange)).toBe(true);
    expect(resolved.get(OBSIDIAN_DEV_TOOLKIT)).toBe('^7.4.0');
  });

  it('holds a peer of obsidian-dev-toolkit inside its peer range', async () => {
    stubPackages(SKEWED_REGISTRY);
    const resolved = await resolveVersions([new Dependency('vitest'), new Dependency(OBSIDIAN_DEV_TOOLKIT)]);
    expect(resolved.get('vitest')).toBe('^5.0.7');
  });

  it('takes the newest version of a range with alternatives, and its caret when that stays inside', async () => {
    stubPackages(SKEWED_REGISTRY);
    const resolved = await resolveVersions([new Dependency('@mnaoumov/typescript-lib'), new Dependency(OBSIDIAN_DEV_TOOLKIT)]);
    expect(resolved.get('@mnaoumov/typescript-lib')).toBe('^2.1.0');
  });

  it('holds a package by the range of the typescript-dev-toolkit version it chose', async () => {
    stubPackages(SKEWED_REGISTRY);
    const resolved = await resolveVersions([new Dependency('eslint'), new Dependency(TYPESCRIPT_DEV_TOOLKIT), new Dependency(OBSIDIAN_DEV_TOOLKIT)]);
    expect(resolved.get('eslint')).toBe('^10.12.0');
  });

  it('writes the range itself when no caret range fits inside it', async () => {
    stubPackages({
      ...SKEWED_REGISTRY,
      '@mnaoumov/obsidian-dev-toolkit': { latest: '7.4.0', manifests: { '7.4.0': { dependencies: { esbuild: '>=0.27.0 <0.28.1' } } }, versions: ['7.4.0'] },
      'esbuild': { latest: '0.28.1', versions: ['0.27.3', '0.28.0', '0.28.1'] }
    });
    const resolved = await resolveVersions([new Dependency('esbuild'), new Dependency(OBSIDIAN_DEV_TOOLKIT)]);
    expect(resolved.get('esbuild')).toBe('>=0.27.0 <0.28.1');
  });

  it('leaves a package unconstrained when no toolkit is in the project', async () => {
    stubPackages(SKEWED_REGISTRY);
    const resolved = await resolveVersions([new Dependency(TYPESCRIPT_DEV_TOOLKIT), new Dependency('vitest')]);
    expect(resolved.get(TYPESCRIPT_DEV_TOOLKIT)).toBe('^6.0.0');
    expect(resolved.get('vitest')).toBe('^6.0.0');
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

  it('forces a literal spec for an advisory reached only through obsidian-integration-testing', () => {
    // These two are never declared by the project, so there is no spec for `$<name>` to reuse -- which is
    // Exactly why they cannot live in the pin table.
    const overrides = buildOverrides([new Dependency('typescript'), new Dependency('obsidian-integration-testing')]);
    expect(overrides['@puppeteer/browsers']).toBe('^3.2.1');
    expect(overrides['deepmerge-ts']).toBe('^8.0.2');
  });

  it('leaves a project without obsidian-integration-testing free of advisory overrides', () => {
    // The standalone preset never reaches webdriverio, so it audits clean on its own; overriding a package
    // Absent from its tree would pull one in.
    const overrides = buildOverrides([new Dependency('typescript')]);
    expect(overrides).not.toHaveProperty('@puppeteer/browsers');
    expect(overrides).not.toHaveProperty('deepmerge-ts');
  });

  // Yarn ignores `overrides` outright, so a yarn project got no forcing at all and `@codemirror/view`
  // Brought a second `@codemirror/state` -- two copies of a CodeMirror facet, which do not interoperate.
  it('states the same forcing as literal resolutions, which is what yarn and pnpm read', () => {
    const dependencies = [new Dependency('@codemirror/state'), new Dependency('obsidian-integration-testing')];
    const resolutions = buildResolutions(dependencies);
    expect(resolutions['@codemirror/state']).toBe(PINNED_VERSIONS['@codemirror/state']?.version);
    expect(resolutions['deepmerge-ts']).toBe('^8.0.2');
    expect(Object.keys(resolutions)).toEqual(Object.keys(buildOverrides(dependencies)));
  });

  it('resolves npm\'s $-shorthand, which means nothing to yarn', () => {
    for (const spec of Object.values(buildResolutions([new Dependency('@codemirror/view')]))) {
      expect(spec.startsWith('$'), `"${spec}" is npm-only shorthand`).toBe(false);
    }
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
    // A biome project has no typescript-eslint, so the check command would just error -- such a pin is
    // Reported for manual review on every run, rather than silently carrying an unrunnable command.
    const parsed = JSON.parse(buildPinnedVersionsJson([new Dependency('typescript')])) as ParsedPinnedVersions;
    expect(parsed.pins['typescript']?.check).toBeNull();
    expect(parsed.pins['typescript']?.manualCheck).toBeTruthy();
  });

  it('documents every advisory override it emits', () => {
    // An override and its justification correspond one to one, so an override that outlives
    // The advisory is visible rather than permanent.
    const parsed = JSON.parse(buildPinnedVersionsJson([new Dependency('obsidian-integration-testing')])) as ParsedPinnedVersions;
    for (const packageName of ['@puppeteer/browsers', 'deepmerge-ts']) {
      const pin = parsed.pins[packageName];
      expect(pin?.section, packageName).toBe('overrides');
      expect(pin?.why, packageName).toContain('GHSA-');
      expect(pin?.check, packageName).toContain('@wdio/utils');
    }
  });
});
