import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  COMMUNITY_PLUGINS_JSON_URL,
  fetchCommunityPluginIds,
  makeUnlistedPluginIdValidator,
  parseCommunityPluginIds,
  validatePluginIdIsUnlisted
} from './directory-registry.ts';

const LISTED_IDS: ReadonlySet<string> = new Set(['calendar', 'dataview']);
const HTTP_NOT_FOUND = 404;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseCommunityPluginIds', () => {
  it('collects every listed id, lowercased', () => {
    expect(parseCommunityPluginIds([{ id: 'dataview' }, { id: 'Some-Mixed' }])).toEqual(new Set(['dataview', 'some-mixed']));
  });

  it('skips an entry with no string id', () => {
    expect(parseCommunityPluginIds([{ id: 'dataview' }, { name: 'No id' }, { id: 1 }])).toEqual(new Set(['dataview']));
  });

  // The directory is never empty, so "no collision" off an empty list would be a check that silently passed.
  it('treats a non-array or an empty list as a failed fetch', () => {
    expect(parseCommunityPluginIds({ id: 'dataview' })).toBeNull();
    expect(parseCommunityPluginIds([])).toBeNull();
    expect(parseCommunityPluginIds([{ name: 'No id' }])).toBeNull();
  });
});

describe('fetchCommunityPluginIds', () => {
  it('reads the list from obsidian-releases', async () => {
    const requested: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      requested.push(url);
      return Promise.resolve(new Response(JSON.stringify([{ id: 'dataview' }])));
    });

    expect(await fetchCommunityPluginIds()).toEqual(new Set(['dataview']));
    expect(requested).toEqual([COMMUNITY_PLUGINS_JSON_URL]);
  });

  // An offline run must still scaffold, so every failure is `null` for the caller to warn about, never a throw.
  it('returns null when the network is unreachable', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    expect(await fetchCommunityPluginIds()).toBeNull();
  });

  it('returns null on a non-OK response', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('Not Found', { status: HTTP_NOT_FOUND })));
    expect(await fetchCommunityPluginIds()).toBeNull();
  });

  it('returns null on a body that is not JSON', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<html>')));
    expect(await fetchCommunityPluginIds()).toBeNull();
  });
});

describe('validatePluginIdIsUnlisted', () => {
  it('accepts an id nobody has published', () => {
    expect(validatePluginIdIsUnlisted('my-helper', LISTED_IDS)).toBeUndefined();
  });

  it('refuses a listed id', () => {
    expect(validatePluginIdIsUnlisted('dataview', LISTED_IDS)).toMatch(/already the id of a plugin in the Community directory/);
  });
});

describe('makeUnlistedPluginIdValidator', () => {
  const validate = makeUnlistedPluginIdValidator(LISTED_IDS);

  it('keeps every shape check the prompt already makes', () => {
    expect(validate('')).toMatch(/not be empty/);
    expect(validate('my-plugin')).toMatch(/not end with "plugin"/);
  });

  it('adds the collision', () => {
    expect(validate('dataview')).toMatch(/already the id/);
    expect(validate('my-helper')).toBeUndefined();
  });
});
