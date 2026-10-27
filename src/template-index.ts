import {
  existsSync,
  readdirSync,
  statSync
} from 'node:fs';
import { join } from 'node:path';

/**
 * A folder whose name is in parentheses, such as `(build)`, groups templates without being part of their path.
 *
 * `templates/default/scripts` held 216 variants of some 60 target files side by side, because a partial has to
 * sit beside the file it composes: `scripts/build.ts@bundler_esbuild.ejs` is found by its name next to
 * `scripts/build.ts`. A group folder lets those variants be sorted by subject (`scripts/(build)/(esbuild)/`)
 * while every template keeps the path the engine composes it under. It is the route-group convention of
 * Next.js and SvelteKit: the segment is for the reader, and the path skips it.
 */
const GROUP_FOLDER_PATTERN = /^\(.+\)$/;

/** Drops every group folder from a template path, giving the path the engine composes it under. */
export function getLogicalTemplatePath(physicalPath: string): string {
  return physicalPath.split('/').filter((segment) => !GROUP_FOLDER_PATTERN.test(segment)).join('/');
}

/**
 * Maps every file under a template root from its logical path to the path on disk, both relative and `/`-separated.
 *
 * Two files with one logical path are refused rather than resolved by walk order: which of them a project
 * got would otherwise depend on `readdirSync`'s order, and the other would be dead with every tier green.
 */
export function indexTemplateDir(root: string): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  for (const physicalPath of walkFiles(root, '')) {
    const logicalPath = getLogicalTemplatePath(physicalPath);
    const existing = index.get(logicalPath);
    if (existing !== undefined) {
      throw new Error(`Two templates in ${root} resolve to ${logicalPath}: ${existing} and ${physicalPath}.`);
    }
    index.set(logicalPath, physicalPath);
  }
  return index;
}

function walkFiles(root: string, relativeDir: string): string[] {
  const absoluteDir = join(root, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const found: string[] = [];
  for (const entry of readdirSync(absoluteDir)) {
    const relativePath = relativeDir === '' ? entry : `${relativeDir}/${entry}`;
    if (statSync(join(root, relativePath)).isDirectory()) {
      found.push(...walkFiles(root, relativePath));
    } else {
      found.push(relativePath);
    }
  }
  return found;
}
