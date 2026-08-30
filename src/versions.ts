import { log } from '@clack/prompts';

import type { Dependency } from './template-builder.ts';

/**
 * A dependency whose version cannot float, and the condition that justifies holding it there.
 *
 * Mirrors the shape of the `pinned-versions.json` the generated project ships, which is what makes an
 * otherwise invisible pin re-checkable on every dependency sweep.
 */
export interface PinnedVersion {
  /** Command whose trimmed stdout is compared against `expect`, or `null` when no mechanical test exists. */
  check: null | string;
  /** The package `check` reads from. When it is absent from the project, `manualCheck` is emitted instead. */
  checkRequires: null | string;
  /** The value `check` is expected to print while the pin is still required. */
  expect: null | string;
  /** How to settle the pin by hand when `check` cannot run. */
  manualCheck: null | string;
  /** Whether the pin also needs an `overrides` entry to reach nested copies in the tree. */
  needsOverride: boolean;
  /** The `package.json` section the pin lives in. */
  section: string;
  /** The exact version to pin to. */
  version: string;
  /** The condition that justifies the pin, in enough detail to judge whether it still holds. */
  why: string;
}

/**
 * Every version the generator refuses to let float, keyed by package name.
 *
 * A package listed here is pinned to `version` instead of being resolved from the registry, and gets an
 * entry in the generated `pinned-versions.json`.
 */
export const PINNED_VERSIONS: Record<string, PinnedVersion> = {
  '@codemirror/language': {
    check: null,
    checkRequires: null,
    expect: null,
    manualCheck: 'Must be the @codemirror/language release built against the @codemirror/state version Obsidian peers on. Bump it only together with @codemirror/state.',
    needsOverride: false,
    section: 'devDependencies',
    version: '6.12.3',
    why: 'Obsidian bundles its own CodeMirror. A @codemirror/language built against a different @codemirror/state duplicates the state package at runtime, and two copies of a CodeMirror facet do not interoperate.'
  },
  '@codemirror/state': {
    check: 'node -e "process.stdout.write(require(\'obsidian/package.json\').peerDependencies[\'@codemirror/state\'])"',
    checkRequires: 'obsidian',
    expect: '6.5.0',
    manualCheck: null,
    needsOverride: true,
    section: 'devDependencies',
    version: '6.5.0',
    why: 'obsidian peers on this exact version. Anything else fails npm install with ERESOLVE, and a second copy in the tree breaks editor extensions at runtime.'
  },
  '@codemirror/view': {
    check: 'node -e "process.stdout.write(require(\'obsidian/package.json\').peerDependencies[\'@codemirror/view\'])"',
    checkRequires: 'obsidian',
    expect: '6.38.6',
    manualCheck: null,
    needsOverride: true,
    section: 'devDependencies',
    version: '6.38.6',
    why: 'obsidian peers on this exact version. Anything else fails npm install with ERESOLVE, and a second copy in the tree breaks editor extensions at runtime.'
  },
  'moment': {
    check: null,
    checkRequires: null,
    expect: null,
    manualCheck: 'Must stay on the version Obsidian bundles, so the plugin and the app share one moment instance. Check Obsidian\'s bundled moment before changing it.',
    needsOverride: false,
    section: 'devDependencies',
    version: '2.29.4',
    why: 'Obsidian bundles moment 2.29.4 and re-exports it. Type-checking against a newer moment describes an API the running app does not have.'
  },
  'typescript': {
    check: 'node -e "process.stdout.write(require(\'typescript-eslint/package.json\').peerDependencies.typescript)"',
    checkRequires: 'typescript-eslint',
    expect: '>=4.8.4 <6.1.0',
    manualCheck: 'TypeScript 7 (tsgo) is a native rewrite much of this toolchain has not migrated to. Re-check that every type-aware tool in the project supports 7 before lifting the pin.',
    needsOverride: true,
    section: 'devDependencies',
    version: '6.0.3',
    why: 'TypeScript 7 (tsgo) breaks this toolchain: typescript-eslint\'s parser crashes on the native API, so type-aware ESLint cannot run on 7. typescript-eslint peer-requires the range below, so 6.x is the last usable major.'
  }
};

/**
 * An `overrides` entry that exists only to clear an npm audit advisory in a package the project never
 * declares, and cannot therefore express through {@link PINNED_VERSIONS}, which pins versions of packages
 * the project depends on directly.
 */
export interface AdvisoryOverride {
  /** Command whose trimmed stdout is compared against `expect`, or `null` when no mechanical test exists. */
  check: null | string;
  /** The value `check` is expected to print while the override is still required. */
  expect: null | string;
  /** How to read the `check` result, and what would make the override droppable. */
  manualCheck: null | string;
  /** The direct dependency whose subtree carries the advisory. Absent from the project, absent from the file. */
  requires: string;
  /** The spec to force every copy in the tree onto. */
  spec: string;
  /** The advisory, why it cannot be fixed by bumping a direct dependency, and why this spec is safe. */
  why: string;
}

/**
 * Overrides that clear an advisory reached only transitively, keyed by package name.
 *
 * Both entries below hang off `obsidian-dev-utils` -> `obsidian-integration-testing` -> `webdriverio`, so
 * the standalone preset, which has none of them, gets neither.
 */
export const ADVISORY_OVERRIDES: Record<string, AdvisoryOverride> = {
  '@puppeteer/browsers': {
    check: 'node -e "const fs=require(\'node:fs\');process.stdout.write(JSON.parse(fs.readFileSync(\'node_modules/@wdio/utils/package.json\',\'utf8\')).dependencies[\'@puppeteer/browsers\'])"',
    expect: '^2.2.0',
    manualCheck: 'The check reads @wdio/utils\'s own declared range, not a version, because that range is what makes the override necessary. When it moves to ^3 or later, @wdio/utils no longer pulls extract-zip in and both this override and this entry can go.',
    requires: 'obsidian-dev-utils',
    spec: '^3.2.0',
    why: 'Clears GHSA-jmr9-qjv8-65gv (extract-zip unvalidated symlink path traversal). extract-zip is vulnerable at every published version, so there is nothing to override it to, and the direct dependency cannot be bumped either: even the newest webdriverio reaches extract-zip through @wdio/utils -> @puppeteer/browsers ^2.x. @puppeteer/browsers@3 replaced extract-zip with modern-tar, so forcing 3.x on @wdio/utils, the only consumer left on 2.x, removes the subtree. @wdio/utils imports only install, canDownload, resolveBuildId, detectBrowserPlatform, Browser, ChromeReleaseChannel, computeExecutablePath and the InstallOptions type, all still exported by 3.x, and both packages are ESM-only. Never take the `npm audit fix --force` remedy: it downgrades obsidian-integration-testing to 1.1.2.'
  },
  'deepmerge-ts': {
    check: 'node -e "const fs=require(\'node:fs\');process.stdout.write(JSON.parse(fs.readFileSync(\'node_modules/@wdio/utils/package.json\',\'utf8\')).dependencies[\'deepmerge-ts\'])"',
    expect: '^7.0.3',
    manualCheck: 'The check reads the range @wdio/utils declares, which is what forces the override. When it moves to ^8 or later the override and this entry can go. Before lifting it, re-run the deepmergeCustom probe: @wdio/config passes a `mergeArrays` handler that reads `meta.key`, and that is the API 8.0.0 renamed.',
    requires: 'obsidian-dev-utils',
    spec: '^8.0.0',
    why: 'Clears GHSA-ggr8-5vv4-36mx (stack exhaustion merging recursive object graphs), patched in 8.0.0. Every wdio package still declares ^7.0.3, including the newest, so no direct bump reaches it and `npm audit fix --force` only offers a downgrade of obsidian-integration-testing to 1.1.2. The forced major is safe for these consumers: 8.0.0 breaks by renaming the mergeInfo system and aligning the customization shorthand, and both surfaces were measured to behave identically on 7.1.6 and 8.0.1 in the exact shapes the tree uses -- @wdio/config\'s `deepmergeCustom` with a `mergeArrays` handler reading `meta.key` and returning `utils.actions.defaultMerge`, and webdriver\'s `deepmergeCustom({ mergeArrays: false })`. A scan of the whole installed tree found no other binding than `deepmerge` and `deepmergeCustom`.'
  }
};

// The same source `obsidian-dev-utils/script-utils/version` reads when it stamps `minAppVersion` on a
// Release, so the scaffold and the project's first `npm run version` agree on where the number comes from.
const DESKTOP_RELEASES_JSON_URL = 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/desktop-releases.json';
/**
 * The `minAppVersion` used when the lookup below fails, which is the offline path.
 *
 * `0.0.0` is the honest answer there: it claims no minimum rather than inventing one, and the project's
 * first `npm run version` overwrites it with the real latest.
 */
export const FALLBACK_MIN_APP_VERSION = '0.0.0';

const FALLBACK_VERSION = 'latest';
const JSON_INDENT_SPACES = 2;
const REGISTRY_URL = 'https://registry.npmjs.org';

interface DesktopReleasesJson {
  latestVersion?: string;
}

interface LatestPackument {
  version: string;
}

/**
 * The `overrides` block for a project built from `dependencies`.
 *
 * Uses npm's `$<name>` shorthand, which reuses the spec already declared for that package, so the pin is
 * stated once and every nested copy in the tree is forced onto it.
 */
export function buildOverrides(dependencies: readonly Dependency[]): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const packageName of getPinnedPackageNames(dependencies)) {
    if (PINNED_VERSIONS[packageName]?.needsOverride) {
      overrides[packageName] = `$${packageName}`;
    }
  }
  for (const [packageName, advisoryOverride] of getAdvisoryOverrides(dependencies)) {
    // A literal spec, not the `$<name>` shorthand: there is no declared spec to reuse, which is the whole
    // Reason these cannot go in the pin table.
    overrides[packageName] = advisoryOverride.spec;
  }
  return overrides;
}

/**
 * Renders the `pinned-versions.json` for a project built from `dependencies`.
 *
 * Only pins whose package is actually present are emitted, so the file never claims a pin the
 * `package.json` next to it does not carry.
 */
export function buildPinnedVersionsJson(dependencies: readonly Dependency[]): string {
  const pins: Record<string, unknown> = {};

  for (const packageName of getPinnedPackageNames(dependencies)) {
    const pin = PINNED_VERSIONS[packageName];
    if (!pin) {
      continue;
    }
    const canCheck = pin.check !== null && (pin.checkRequires === null || hasPackage(dependencies, pin.checkRequires));
    pins[packageName] = canCheck
      ? {
        check: pin.check,
        expect: pin.expect,
        section: pin.section,
        why: pin.why
      }
      : {
        check: null,
        manualCheck: pin.manualCheck ?? pin.why,
        section: pin.section,
        why: pin.why
      };
  }

  for (const [packageName, advisoryOverride] of getAdvisoryOverrides(dependencies)) {
    pins[packageName] = {
      check: advisoryOverride.check,
      expect: advisoryOverride.expect,
      manualCheck: advisoryOverride.manualCheck,
      section: 'overrides',
      why: advisoryOverride.why
    };
  }

  const content = {
    comment: [
      'Release conditions for every exact-pinned version in package.json (dependencies, devDependencies and',
      'overrides), plus every override added to clear an npm audit advisory reached only transitively.',
      'An exact pin is invisible to a caret-range dependency sweep, so nothing would ever remind you',
      'that a pin is stale. This file is what makes that check happen: run each `check` and compare its trimmed',
      'stdout to `expect`. Equal means the pin is still required; different means the condition that justified it',
      'has changed and the pin should be re-examined. `check: null` means no mechanical test exists - follow',
      '`manualCheck` instead. Every exact pin belongs here, and every entry must name a package that is actually',
      'present in the declared section.'
    ],
    pins
  };

  return `${JSON.stringify(content, null, JSON_INDENT_SPACES)}\n`;
}

/**
 * The latest public desktop Obsidian version, for the generated `manifest.json`'s `minAppVersion`.
 *
 * Falls back to a version that claims no minimum when the lookup fails, so generating offline still
 * produces a valid manifest.
 */
export async function fetchLatestObsidianVersion(): Promise<string> {
  try {
    const response = await fetch(DESKTOP_RELEASES_JSON_URL);
    if (!response.ok) {
      return FALLBACK_MIN_APP_VERSION;
    }
    const desktopReleasesJson = await response.json() as DesktopReleasesJson;
    return desktopReleasesJson.latestVersion ?? FALLBACK_MIN_APP_VERSION;
  } catch {
    return FALLBACK_MIN_APP_VERSION;
  }
}

/**
 * The version the registry currently tags `latest` for `packageName`, or `null` when the lookup fails.
 */
export async function fetchLatestVersion(packageName: string): Promise<null | string> {
  try {
    const response = await fetch(`${REGISTRY_URL}/${packageName}/latest`);
    if (!response.ok) {
      return null;
    }
    const packument = await response.json() as LatestPackument;
    return packument.version;
  } catch {
    return null;
  }
}

/**
 * Resolves every dependency to a concrete `package.json` spec.
 *
 * An explicit version passed to `addPackage` wins, then the pin table, then the registry's current
 * `latest` as a caret range. A registry lookup that fails falls back to the literal `latest` so the
 * generator still works offline.
 */
export async function resolveVersions(dependencies: readonly Dependency[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const unresolved: string[] = [];

  for (const dependency of dependencies) {
    if (dependency.version !== null) {
      resolved.set(dependency.packageName, dependency.version);
      continue;
    }

    const pin = PINNED_VERSIONS[dependency.packageName];
    if (pin) {
      resolved.set(dependency.packageName, pin.version);
      continue;
    }

    unresolved.push(dependency.packageName);
  }

  const fetched = await Promise.all(unresolved.map(fetchLatestVersion));
  const failed: string[] = [];

  for (const [index, version] of fetched.entries()) {
    const packageName = unresolved[index] ?? '';
    if (version === null) {
      failed.push(packageName);
      resolved.set(packageName, FALLBACK_VERSION);
      continue;
    }
    resolved.set(packageName, `^${version}`);
  }

  if (failed.length > 0) {
    log.warn(`Could not look up the latest version of ${failed.join(', ')}. Falling back to "${FALLBACK_VERSION}".`);
  }

  return resolved;
}

function getAdvisoryOverrides(dependencies: readonly Dependency[]): [string, AdvisoryOverride][] {
  return Object.entries(ADVISORY_OVERRIDES)
    .filter(([, advisoryOverride]) => hasPackage(dependencies, advisoryOverride.requires))
    .sort(([a], [b]) => a.localeCompare(b));
}

function getPinnedPackageNames(dependencies: readonly Dependency[]): string[] {
  return dependencies
    .map((dependency) => dependency.packageName)
    .filter((packageName) => packageName in PINNED_VERSIONS)
    .sort((a, b) => a.localeCompare(b));
}

function hasPackage(dependencies: readonly Dependency[], packageName: string): boolean {
  return dependencies.some((dependency) => dependency.packageName === packageName);
}
