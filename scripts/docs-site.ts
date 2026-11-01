/**
 * @file
 *
 * The `docs:build`, `docs:dev` and `docs:preview` commands of this repository's documentation site.
 *
 * They follow typescript-dev-toolkit's `docs-site-commands`, minus its API reference: this package is a CLI, so
 * its `src/` is the generator's internals rather than an API anyone imports, and the site is the guides alone.
 */

import { assertDocsLinksResolve } from '@mnaoumov/typescript-dev-toolkit/docs-site/docs-links';
import { getDocsSiteAssetsDirectory } from '@mnaoumov/typescript-dev-toolkit/docs-site/docs-site-assets';
import { resolveDocsSiteConfig } from '@mnaoumov/typescript-dev-toolkit/docs-site/docs-site-config';
import { generateOgImages } from '@mnaoumov/typescript-dev-toolkit/docs-site/og-images';
import { syncRepoHomepage } from '@mnaoumov/typescript-dev-toolkit/docs-site/repo-homepage';
import { execFromRoot } from '@mnaoumov/typescript-dev-toolkit/root';
import {
  mkdir,
  writeFile
} from 'node:fs/promises';
import {
  dirname,
  join
} from 'node:path';
import process from 'node:process';

import { DOCS_SITE_CONFIG } from './docs-site-config.ts';

const resolved = resolveDocsSiteConfig(DOCS_SITE_CONFIG);

/**
 * Builds the site: the Open Graph cards, `astro build`, then a check of every link in the output. It then compares
 * the repository's GitHub homepage with the site's URL.
 */
export async function buildDocsSite(): Promise<void> {
  await writeEmptyApiSidebar();
  await generateOgImages({
    brandText: resolved.packageName,
    contentDocsDirectory: resolved.contentDocsDirectory,
    faviconPath: resolved.faviconPath,
    fontsDirectory: join(getDocsSiteAssetsDirectory(), 'fonts'),
    outputDirectory: resolved.ogOutputDirectory
  });
  await execFromRoot(['astro', 'build'], { cwd: resolved.rootDirectory });
  await assertDocsLinksResolve({ outputDirectory: resolved.distDirectory, siteBaseUrl: resolved.siteBaseUrl });
  if (resolved.repoHomepage !== 'off') {
    await syncRepoHomepage({ homepageUrl: resolved.siteBaseUrl, mode: resolved.repoHomepage, owner: resolved.owner, repo: resolved.repo });
  }
}

/**
 * Serves the site with `astro dev` until it is stopped, passing on the script's own arguments.
 */
export async function devDocsSite(): Promise<void> {
  await writeEmptyApiSidebar();
  // `ASTRO_DEV_BACKGROUND` keeps Astro's dev server in the foreground under a non-interactive shell.
  await execFromRoot(['astro', 'dev', ...getScriptArguments()], {
    cwd: resolved.rootDirectory,
    env: { ASTRO_DEV_BACKGROUND: '1' },
    isInteractive: true
  });
}

/**
 * Serves the last build with `astro preview` until it is stopped, passing on the script's own arguments.
 */
export async function previewDocsSite(): Promise<void> {
  await execFromRoot(['astro', 'preview', ...getScriptArguments()], { cwd: resolved.rootDirectory, isInteractive: true });
}

function getScriptArguments(): string[] {
  const [, , ...scriptArguments] = process.argv;
  return scriptArguments;
}

/**
 * The shared Astro config appends the API reference's sidebar file, and warns when it is missing. This site has no
 * API reference, so the file is written empty rather than left to warn on every build.
 */
async function writeEmptyApiSidebar(): Promise<void> {
  const sidebarFile = resolved.apiDocSettings.sidebarFile;
  await mkdir(dirname(sidebarFile), { recursive: true });
  await writeFile(sidebarFile, '[]\n');
}
