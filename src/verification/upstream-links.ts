/**
 * Finds the links this repo cites into obsidian-lib's source tree, and which of them name nothing.
 *
 * The defect class is an upstream rename that silently breaks a downstream link. The retired obsidian-dev-utils, which the
 * templates cited before obsidian-lib replaced it, renamed every file to kebab-case in `77c2bac1`, and the stylesheet templates went on citing `src/CssClass.ts` for
 * seven months, emitting a 404 into every generated plugin. A link cannot be checked against the published
 * package -- it ships `dist/` and no `src/` -- so it is resolved against the git tree of a checkout, which
 * is also what keeps the check off the network.
 */

/** The repository the links point into. */
export const UPSTREAM_REPOSITORY_URL = 'https://github.com/mnaoumov/obsidian-lib';

/** One cited location in obsidian-lib. */
export interface UpstreamLink {
  /** The file of this repo that cites it, relative to the repo root. */
  readonly file: string;
  /** `blob` / `raw` name a file, `tree` names a directory. */
  readonly kind: 'blob' | 'raw' | 'tree';
  /** One-based. */
  readonly line: number;
  /** The path inside the repository, with no leading or trailing slash. */
  readonly path: string;
  /** The branch, tag or commit the link reads from. */
  readonly ref: string;
  readonly url: string;
}

/**
 * A literal link into the repository's file view. The path stops at whitespace, a Markdown or HTML
 * delimiter, a quote, a query or a fragment. `<` and `$` stop it as well, so that a templated tail (`<%= %>`,
 * `${}`) is left out rather than checked half-rendered.
 */
const LINK_PATTERN = /https:\/\/github\.com\/mnaoumov\/obsidian-lib\/(?<kind>blob|raw|tree)\/(?<ref>[^/\s]+)\/(?<path>[^\s)\]"'`<>#?${}]+)/g;

/** Sentence punctuation that ends a prose line, never a path. */
const TRAILING_PUNCTUATION = /[.,;:!]+$/;

/** A cited location with nothing at it. */
export interface DeadUpstreamLink {
  readonly link: UpstreamLink;
  readonly reason: string;
}

/**
 * The links that name nothing in the tree they read from.
 *
 * @param links - What {@link findUpstreamLinks} found.
 * @param filesAt - The files tracked at a ref, or `undefined` when the ref cannot be resolved -- which is
 * reported against every link reading from it, because a link that could not be checked was not checked.
 */
export function findDeadUpstreamLinks(links: readonly UpstreamLink[], filesAt: (ref: string) => ReadonlySet<string> | undefined): DeadUpstreamLink[] {
  const dead: DeadUpstreamLink[] = [];
  const directoriesByRef = new Map<string, Set<string>>();

  for (const link of links) {
    const files = filesAt(link.ref);
    if (files === undefined) {
      dead.push({ link, reason: `ref ${link.ref} does not exist in the checkout` });
      continue;
    }

    if (link.kind === 'tree') {
      let directories = directoriesByRef.get(link.ref);
      if (directories === undefined) {
        directories = collectDirectories(files);
        directoriesByRef.set(link.ref, directories);
      }
      if (!directories.has(link.path)) {
        dead.push({ link, reason: `no directory ${link.path} at ${link.ref}` });
      }
      continue;
    }

    if (!files.has(link.path)) {
      dead.push({ link, reason: `no file ${link.path} at ${link.ref}` });
    }
  }

  return dead;
}

/** Every link into obsidian-lib's source tree that `text` cites, a templated one excepted. */
export function findUpstreamLinks(file: string, text: string): UpstreamLink[] {
  const links: UpstreamLink[] = [];
  const lines = text.split('\n');
  for (const [index, lineText] of lines.entries()) {
    for (const match of lineText.matchAll(LINK_PATTERN)) {
      const { kind, path: rawPath, ref } = match.groups ?? {};
      if (kind === undefined || rawPath === undefined || ref === undefined) {
        continue;
      }

      const nextCharacter = lineText.charAt(match.index + match[0].length);
      if (nextCharacter === '<' || nextCharacter === '$') {
        continue;
      }

      const path = rawPath.replace(TRAILING_PUNCTUATION, '').replace(/\/+$/, '');
      links.push({
        file,
        kind: kind as UpstreamLink['kind'],
        line: index + 1,
        path,
        ref,
        url: `${UPSTREAM_REPOSITORY_URL}/${kind}/${ref}/${path}`
      });
    }
  }

  return links;
}

function collectDirectories(files: ReadonlySet<string>): Set<string> {
  const directories = new Set<string>();
  for (const file of files) {
    const segments = file.split('/');
    for (let length = 1; length < segments.length; length++) {
      directories.add(segments.slice(0, length).join('/'));
    }
  }

  return directories;
}
