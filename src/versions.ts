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

const FALLBACK_VERSION = 'latest';
const JSON_INDENT_SPACES = 2;
const REGISTRY_URL = 'https://registry.npmjs.org';

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

  const content = {
    comment: [
      'Release conditions for every exact-pinned version in package.json (dependencies, devDependencies and',
      'overrides). An exact pin is invisible to a caret-range dependency sweep, so nothing would ever remind you',
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

function getPinnedPackageNames(dependencies: readonly Dependency[]): string[] {
  return dependencies
    .map((dependency) => dependency.packageName)
    .filter((packageName) => packageName in PINNED_VERSIONS)
    .sort((a, b) => a.localeCompare(b));
}

function hasPackage(dependencies: readonly Dependency[], packageName: string): boolean {
  return dependencies.some((dependency) => dependency.packageName === packageName);
}
