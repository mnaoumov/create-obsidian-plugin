import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  describe,
  expect,
  it
} from 'vitest';

import { getScriptDir } from '../templates.ts';
import {
  findDeadUpstreamLinks,
  findUpstreamLinks
} from './upstream-links.ts';

const BASE = 'https://github.com/mnaoumov/obsidian-lib';

/** Both links in the first case sit on the text's second line. */
const LINK_LINE = 2;

describe('findUpstreamLinks', () => {
  it('reads the kind, ref, path and line of each link', () => {
    const text = `first line\n * See ${BASE}/blob/main/src/obsidian/css-class.ts and [dir](${BASE}/tree/v1/src/styles/).`;
    expect(findUpstreamLinks('a.ejs', text)).toEqual([
      { file: 'a.ejs', kind: 'blob', line: LINK_LINE, path: 'src/obsidian/css-class.ts', ref: 'main', url: `${BASE}/blob/main/src/obsidian/css-class.ts` },
      { file: 'a.ejs', kind: 'tree', line: LINK_LINE, path: 'src/styles', ref: 'v1', url: `${BASE}/tree/v1/src/styles` }
    ]);
  });

  it('drops sentence punctuation, a fragment and a query from the path', () => {
    const text = `See ${BASE}/blob/main/README.md. Also ${BASE}/blob/main/a.ts#L3 and ${BASE}/raw/main/b.json?x=1`;
    expect(findUpstreamLinks('a.md', text).map((link) => link.path)).toEqual(['README.md', 'a.ts', 'b.json']);
  });

  it('leaves out a link whose path is templated', () => {
    const text = `${BASE}/blob/main/src/<%= name %>.ts and \`${BASE}/blob/main/src/\${name}.ts\``;
    expect(findUpstreamLinks('a.ejs', text)).toEqual([]);
  });

  it('ignores other repositories, including one whose name only starts the same', () => {
    const text = 'https://github.com/mnaoumov/obsidian-lib-extra/blob/main/a.ts https://github.com/other/obsidian-lib/blob/main/a.ts';
    expect(findUpstreamLinks('a.md', text)).toEqual([]);
  });

  // The extraction is the only thing standing between a dead link and the verify script, and a pattern that
  // Stopped matching would report every template clean. So it is held to the links the templates cite today.
  it('finds the links the stylesheet templates cite', () => {
    const file = 'templates/default/src/styles/main.css_framework.ejs';
    const text = readFileSync(join(getScriptDir(), '..', file), 'utf-8');
    expect(findUpstreamLinks(file, text).map((link) => link.path)).toEqual(['src/styles/main.scss', 'src/css-class.ts']);
  });
});

describe('findDeadUpstreamLinks', () => {
  const files = new Set(['README.md', 'src/obsidian/css-class.ts', 'src/styles/main.scss']);
  function filesAt(ref: string): ReadonlySet<string> | undefined {
    return ref === 'main' ? files : undefined;
  }

  it('reports a file the tree does not have, and passes one it does', () => {
    const links = findUpstreamLinks('a.ejs', `${BASE}/blob/main/src/CssClass.ts\n${BASE}/blob/main/src/obsidian/css-class.ts`);
    expect(findDeadUpstreamLinks(links, filesAt).map((dead) => dead.reason)).toEqual(['no file src/CssClass.ts at main']);
  });

  it('resolves a tree link against the directories, not the files', () => {
    const links = findUpstreamLinks('a.md', `${BASE}/tree/main/src/styles ${BASE}/tree/main/src/obsidian/css-class.ts ${BASE}/tree/main/src/gone`);
    expect(findDeadUpstreamLinks(links, filesAt).map((dead) => dead.link.path)).toEqual(['src/obsidian/css-class.ts', 'src/gone']);
  });

  it('reports every link on a ref the checkout cannot resolve', () => {
    const links = findUpstreamLinks('a.md', `${BASE}/blob/v999/README.md`);
    expect(findDeadUpstreamLinks(links, filesAt).map((dead) => dead.reason)).toEqual(['ref v999 does not exist in the checkout']);
  });
});
