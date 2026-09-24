import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs';
import {
  isAbsolute,
  join,
  relative,
  resolve
} from 'node:path';

import type {
  RenderSite,
  TemplateInventory
} from './plan-checks.ts';

import { loadTemplateInventory } from './plan-checks.ts';
import { PARTIAL_NAME_PATTERN } from './template-builder.ts';

/**
 * A user's own customization, layered over `templates/default`.
 *
 * The directory mirrors `templates/default` and is searched AHEAD of it, so a template placed at a
 * built-in's path overrides it; `overlay.json` declares what cannot be carried by a file's path alone.
 */
export interface Overlay {
  /** README badges, appended after the built-in ones on the same line. */
  badges: readonly string[];
  /** Absolute path of the overlay directory. */
  dir: string;
  /** Paths the overlay adds to every project, which no built-in template registers. */
  files: readonly string[];
  /** Packages added to `devDependencies`, their versions resolved like any built-in one. */
  packages: readonly string[];
  /** Partial names the overlay contributes, rendered after every built-in partial at each seam. */
  partials: readonly string[];
}

export const OVERLAY_MANIFEST_FILE_NAME = 'overlay.json';

/** The one file besides the manifest an overlay may carry that is not a template: its own documentation. */
const OVERLAY_README_FILE_NAME = 'README.md';

const EJS_SUFFIX = '.ejs';

const MANIFEST_KEYS = ['badges', 'files', 'packages', 'partials'] as const;

/** The shape npm accepts for a package name, scoped or not. */
const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

type ManifestKey = typeof MANIFEST_KEYS[number];

/** What `overlay.json` declares: everything in {@link Overlay} but where it was read from. */
type OverlayManifest = Pick<Overlay, ManifestKey>;

/**
 * Reads an overlay directory and refuses one that would silently do nothing, or silently do something else.
 *
 * The four verification tiers sweep the built-in answer space, and an overlay is outside it by definition,
 * so none of them can reach what a user actually generates with one. What is checked instead is the
 * smaller contract an overlay can be held to at load time, without rendering and without the dev-only
 * toolchain the render tier needs:
 *
 * - every template it carries is reachable -- a partial either names a declared partial or overrides a
 *   built-in partial file by path, a whole file either overrides a registrable built-in or is declared in
 *   `files`, and a section partial answers a `render()` site that exists;
 * - it cannot hijack a built-in answer, because a declared partial name may not be one `templates/default`
 *   already uses -- partial names are one flat namespace, and `esbuild` declared here would pull every
 *   esbuild partial into every project;
 * - what it declares exists, and a badge is one line, since the badges share one README source line.
 *
 * A file the overlay carries but the chosen answers do not register (an override of `vite.config.ts` on an
 * esbuild project) is NOT an error: an override applies exactly when the built-in it replaces is emitted.
 */
export function loadOverlay(dir: string, builtIn: TemplateInventory = loadTemplateInventory()): Overlay {
  const absoluteDir = resolve(dir);
  if (!existsSync(absoluteDir) || !statSync(absoluteDir).isDirectory()) {
    throw new Error(`Custom template directory not found: ${absoluteDir}`);
  }

  const manifestPath = join(absoluteDir, OVERLAY_MANIFEST_FILE_NAME);
  if (!existsSync(manifestPath)) {
    throw new Error(`Custom template directory has no ${OVERLAY_MANIFEST_FILE_NAME}: ${absoluteDir}`);
  }

  const manifest = readManifest(manifestPath);
  const overlay: Overlay = { ...manifest, dir: absoluteDir };
  const problems = findOverlayProblems(overlay, loadTemplateInventory(absoluteDir), builtIn);
  if (problems.length > 0) {
    throw new Error(`Custom template ${absoluteDir} is not valid:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }

  return overlay;
}

/**
 * Where `.create-obsidian-plugin.json` points at an overlay: relative to the project, so the record keeps
 * working in a clone that has the overlay beside it, and absolute only when no relative path exists.
 */
export function toRecordedOverlayPath(overlayDir: string, projectDir: string): string {
  const relativePath = relative(projectDir, overlayDir);
  return isAbsolute(relativePath) ? relativePath : relativePath.replaceAll('\\', '/');
}

/** What `overlay.json` declares that does not hold: bad names, and declarations nothing in the overlay backs. */
function findManifestProblems(overlay: Overlay, own: TemplateInventory, builtIn: TemplateInventory): string[] {
  const problems: string[] = [];
  const builtInPartialNames = new Set(builtIn.partials.map((partial) => partial.partialName));
  const builtInFiles = getEmittableFiles(builtIn);
  const ownFiles = getEmittableFiles(own);

  for (const name of overlay.partials) {
    if (!PARTIAL_NAME_PATTERN.test(name)) {
      problems.push(`Partial "${name}" is not kebab-case, so its files would not be recognized as partials.`);
    } else if (builtInPartialNames.has(name)) {
      problems.push(`Partial "${name}" is already a built-in partial name. Partial names are one namespace, so declaring it would pull the built-in "${name}" files into every project. Choose another name.`);
    } else if (!own.partials.some((partial) => partial.partialName === name)) {
      problems.push(`Partial "${name}" is declared, but no file in the overlay contributes it.`);
    }
  }

  for (const packageName of overlay.packages) {
    if (!PACKAGE_NAME_PATTERN.test(packageName)) {
      problems.push(`Package "${packageName}" is not a valid npm package name. List the name only; its version is resolved at generation time.`);
    }
  }

  for (const badge of overlay.badges) {
    if (badge.trim() === '' || /[\r\n]/.test(badge)) {
      problems.push(`Badge ${JSON.stringify(badge)} must be one non-empty line: every badge shares the README's badge line.`);
    }
  }

  for (const path of overlay.files) {
    if (path.endsWith(EJS_SUFFIX)) {
      problems.push(`File "${path}" names a template. List the emitted path, without ${EJS_SUFFIX}.`);
    } else if (builtInFiles.has(path)) {
      problems.push(`File "${path}" is a built-in file. To override it, place its template at the same path; listing it in "files" would emit it whatever the answers are.`);
    } else if (!ownFiles.has(path)) {
      problems.push(`File "${path}" is declared, but the overlay has no ${path}${EJS_SUFFIX} for it.`);
    }
  }

  return problems;
}

function findOverlayProblems(overlay: Overlay, own: TemplateInventory, builtIn: TemplateInventory): string[] {
  return [
    ...findManifestProblems(overlay, own, builtIn),
    ...findTemplateProblems(overlay, own, builtIn),
    ...listStrayFiles(overlay.dir, own).map((path) => `${path} is neither a template (${EJS_SUFFIX}), an asset, ${OVERLAY_MANIFEST_FILE_NAME} nor the overlay's own ${OVERLAY_README_FILE_NAME}, so it would be ignored.`)
  ];
}

/** Templates the overlay carries that nothing would ever render. */
function findTemplateProblems(overlay: Overlay, own: TemplateInventory, builtIn: TemplateInventory): string[] {
  const problems: string[] = [];
  const builtInPartialPaths = new Set(builtIn.partials.map((partial) => partial.path));
  const builtInFiles = getEmittableFiles(builtIn);
  const declaredPartials = new Set(overlay.partials);
  const declaredFiles = new Set(overlay.files);

  for (const path of own.directTemplates) {
    if (!builtInFiles.has(path) && !declaredFiles.has(path)) {
      problems.push(`${path}${EJS_SUFFIX} overrides no built-in file and is not listed in "files", so nothing would ever emit it.`);
    }
  }

  for (const path of own.assetTemplates) {
    if (!builtInFiles.has(path) && !declaredFiles.has(path)) {
      problems.push(`${path} overrides no built-in file and is not listed in "files", so nothing would ever emit it.`);
    }
  }

  const renderSites = [...builtIn.renderSites, ...own.renderSites];
  for (const partial of own.partials) {
    if (builtInPartialPaths.has(partial.path)) {
      continue;
    }

    if (!declaredPartials.has(partial.partialName)) {
      problems.push(`${partial.path} contributes partial "${partial.partialName}", which is neither declared in "partials" nor a built-in partial file at that path.`);
      continue;
    }

    if (partial.section === null) {
      if (!builtInFiles.has(partial.basePath) && !declaredFiles.has(partial.basePath)) {
        problems.push(`${partial.path} composes ${partial.basePath}, which is neither a built-in file nor listed in "files".`);
      }
    } else if (!hasRenderSite(renderSites, partial.basePath, partial.section)) {
      problems.push(`${partial.path} answers render('${partial.section}') in ${partial.basePath}, and no template makes that call.`);
    }
  }

  return problems;
}

/** Every file path a template inventory can emit: its own templates, its assets and what its partials compose. */
function getEmittableFiles(inventory: TemplateInventory): Set<string> {
  return new Set([...inventory.directTemplates, ...inventory.assetTemplates, ...inventory.wholeFilePartialsByBase.keys()]);
}

function hasRenderSite(renderSites: readonly RenderSite[], basePath: string, section: string): boolean {
  return renderSites.some((site) => site.section === section && site.basePath === basePath);
}

/** Everything in the overlay directory the inventory walk skipped, minus the two files that are expected. */
function listStrayFiles(dir: string, own: TemplateInventory): string[] {
  const accounted = new Set<string>([
    ...[...own.directTemplates].map((path) => `${path}${EJS_SUFFIX}`),
    ...own.assetTemplates,
    ...own.partials.map((partial) => partial.path),
    OVERLAY_MANIFEST_FILE_NAME,
    OVERLAY_README_FILE_NAME
  ]);
  return walkFiles(dir, '').filter((path) => !accounted.has(path));
}

function readManifest(manifestPath: string): OverlayManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch {
    throw new Error(`${manifestPath} is not valid JSON.`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${manifestPath} should contain a JSON object.`);
  }

  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(MANIFEST_KEYS as readonly string[]).includes(key)) {
      throw new Error(`${manifestPath} has an unknown key "${key}". The keys are: ${MANIFEST_KEYS.join(', ')}.`);
    }
  }

  function readList(key: ManifestKey): string[] {
    const value = record[key] ?? [];
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new Error(`"${key}" in ${manifestPath} should be an array of strings.`);
    }
    return value as string[];
  }

  return {
    badges: readList('badges'),
    files: readList('files'),
    packages: readList('packages'),
    partials: readList('partials')
  };
}

function walkFiles(root: string, relativeDir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(root, relativeDir))) {
    const relativePath = relativeDir === '' ? entry : `${relativeDir}/${entry}`;
    if (statSync(join(root, relativePath)).isDirectory()) {
      found.push(...walkFiles(root, relativePath));
    } else {
      found.push(relativePath);
    }
  }
  return found;
}
