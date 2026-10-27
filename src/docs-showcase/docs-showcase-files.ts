import {
  existsSync,
  readdirSync,
  readFileSync
} from 'node:fs';
import {
  join,
  relative
} from 'node:path';

import type { GeneratedFile } from '../templates.ts';
import type { ShowcaseReportEntry } from './showcase-tree.ts';

/** The `upstreams.json` entry for obsidianmd/obsidian-developer-docs. */
export const DOCS_SHOWCASE_UPSTREAM_NAME = 'obsidian-developer-docs';

/** The folder of the generated project the showcase is written to. */
export const DOCS_SHOWCASE_TREE_DIR = join('src', 'docs');

/**
 * Where the generated showcase is vendored, relative to the repository root. It mirrors the generated project:
 * `files/src/docs/...` is written to `src/docs/...`.
 */
export const DOCS_SHOWCASE_FILES_DIR = join('templates', 'docs-showcase', 'files');

/** The hand-written host the sync copies into the showcase folder beside the generated modules. */
export const DOCS_SHOWCASE_HOST_DIR = join('templates', 'docs-showcase', 'host');

/** The fate of every code block of the docs, written by the sync. */
export const DOCS_SHOWCASE_REPORT_PATH = join('templates', 'docs-showcase', 'snippets.json');

/** `snippets.json`: the upstream commit and `obsidian` version the showcase was built and checked against, and every block. */
export interface DocsShowcaseReport {
  readonly commit: string;
  readonly entries: ShowcaseReportEntry[];
  readonly obsidianVersion: string;
  readonly repo: string;
}

/**
 * The vendored showcase, as files of the generated project: each path relative to the project root, each content
 * as text. Nothing in it depends on the answers, so it is copied as it is.
 *
 * @param packageRoot - The generator's package root.
 * @returns The files, in sorted order. None when the showcase has not been generated.
 */
export function readDocsShowcaseFiles(packageRoot: string): GeneratedFile[] {
  const filesDir = join(packageRoot, DOCS_SHOWCASE_FILES_DIR);
  if (!existsSync(filesDir)) {
    return [];
  }
  return readdirSync(filesDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort((a, b) => a.localeCompare(b))
    .map((fullPath) => ({
      content: readFileSync(fullPath, 'utf-8'),
      destinationPath: relative(filesDir, fullPath).replaceAll('\\', '/')
    }));
}
