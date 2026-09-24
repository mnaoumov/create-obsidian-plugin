/**
 * @file
 *
 * The one Community directory constraint on the plugin id that the answer alone cannot decide: the id has
 * to be unique across `community-plugins.json`, which is a fact about the world rather than about the
 * string. `directory-constraints.ts` holds every other one.
 *
 * It cannot live where those do. A clack `validate` callback is synchronous, so the list is fetched once,
 * between the answers being complete and anything being written, and the set it yields is what a re-prompt's
 * synchronous validator then reads.
 *
 * **A failed fetch is never a refusal.** Generating offline has to work, exactly as `resolveVersions()`
 * falling back to `latest` and `minAppVersion` falling back to `0.0.0` make it work; the caller warns that
 * the id went unchecked instead.
 */

import { validatePluginId } from './directory-constraints.ts';

interface CommunityPluginEntry {
  id?: unknown;
}

/**
 * The directory's list of published plugins. Read from the same repository and branch as
 * `desktop-releases.json`, which is where `minAppVersion` comes from.
 */
export const COMMUNITY_PLUGINS_JSON_URL = 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json';

/**
 * Every id listed in `community-plugins.json`, lowercased, or `null` when the list could not be fetched or
 * did not have the expected shape.
 */
export async function fetchCommunityPluginIds(): Promise<null | ReadonlySet<string>> {
  try {
    const response = await fetch(COMMUNITY_PLUGINS_JSON_URL);
    if (!response.ok) {
      return null;
    }
    return parseCommunityPluginIds(await response.json());
  } catch {
    return null;
  }
}

/**
 * The prompt validator for a re-entered id: every check {@link validatePluginId} makes, then the collision.
 */
export function makeUnlistedPluginIdValidator(listedIds: ReadonlySet<string>): (input: string | undefined) => string | undefined {
  return (input) => validatePluginId(input) ?? validatePluginIdIsUnlisted(input ?? '', listedIds);
}

/**
 * The listed ids out of a parsed `community-plugins.json`, or `null` when it is not an array of entries.
 *
 * An empty list is treated as a failure too: the directory is never empty, so an empty array is a broken
 * response, and reporting "no collision" off it would be a check that silently passed.
 */
export function parseCommunityPluginIds(json: unknown): null | ReadonlySet<string> {
  if (!Array.isArray(json)) {
    return null;
  }

  const ids = new Set<string>();
  for (const entry of json as CommunityPluginEntry[]) {
    if (typeof entry.id === 'string') {
      ids.add(entry.id.toLowerCase());
    }
  }

  return ids.size === 0 ? null : ids;
}

/**
 * Reports that `pluginId` is already taken in the directory, or `undefined` when it is free.
 */
export function validatePluginIdIsUnlisted(pluginId: string, listedIds: ReadonlySet<string>): string | undefined {
  if (!listedIds.has(pluginId.toLowerCase())) {
    return undefined;
  }

  return `"${pluginId}" is already the id of a plugin in the Community directory -- the directory requires every id to be unique, and an id can never be changed once the plugin is published`;
}
