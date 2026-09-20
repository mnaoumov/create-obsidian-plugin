/**
 * @file
 *
 * The Obsidian Community directory's constraints on the three answers that become `manifest.json`'s
 * `id`, `name` and `description`, enforced at the moment they are answered.
 *
 * The directory re-checks every submission automatically, and it reads the manifest at default-branch
 * HEAD -- so a violation found after the fact costs a version bump and a fresh release. An `id` is worse
 * than that: it can never be changed once the plugin is published, which makes it the single most
 * expensive answer here to get wrong. Checking at the prompt is the only place the cost is zero.
 *
 * **These constraints are stated twice on purpose.** `obsidian-dev-utils` carries the same set as four
 * ESLint rules over a repo's `manifest.json` (`manifest-id`, `manifest-name`, `manifest-description`,
 * `manifest-schema`), which is what catches an already-generated project. This generator must not depend
 * on any obsidian ecosystem package (see `AGENTS.md`), and these run at CLI runtime rather than at lint
 * time, so the set is re-stated here rather than imported. Change one and change the other.
 *
 * **Two checks the obvious reading of the rules would get wrong**, both measured across the live
 * listings rather than reasoned about:
 *
 * - **A description may say `plugin`; it may not refer to ITSELF.** `Enhances Note composer core
 *   plugin.` and `...not plugin updates...` are both published and both passed the review untouched,
 *   because each names something other than itself. Only the self-referential phrasings are matched.
 * - **A description has no character whitelist.** Seven live listings carry backticks, em dashes,
 *   parentheses, colons and slashes, and the directory flagged none of them. Only emoji are rejected.
 *
 * The no-`Obsidian`-in-a-description rule has the opposite provenance: the directory enforces it and no
 * Obsidian document states it -- `Submission requirements for plugins.md` reads the other way. It cost a
 * released plugin a whole version for one word, which is why the message says so rather than saying
 * `invalid`.
 */

/**
 * The names of Obsidian's core plugins and core features, which the directory refuses to let a community
 * plugin take.
 *
 * The plugin half is the UI name of every entry in `obsidian-typings`' `InternalPluginName` (read
 * 2026-09-20), minus `editor-status`, which has no UI name. The feature half is the modes and views that
 * are not plugins at all. It is a snapshot: Obsidian adds core plugins, so a name accepted here can still
 * be rejected by the review. The match is exact and case-insensitive -- a name that merely CONTAINS one
 * of these (`Better Search`, `Canvas Randomizer`) is fine and common.
 */
export const CORE_FEATURE_NAMES: readonly string[] = [
  'Audio recorder',
  'Backlinks',
  'Bases',
  'Bookmarks',
  'Canvas',
  'Command palette',
  'Daily notes',
  'File recovery',
  'Files',
  'Footnotes',
  'Format converter',
  'Graph view',
  'Live Preview',
  'Note composer',
  'Outgoing links',
  'Outline',
  'Page preview',
  'Properties view',
  'Publish',
  'Quick Switcher',
  'Random note',
  'Reading view',
  'Search',
  'Slash commands',
  'Slides',
  'Source mode',
  'Sync',
  'Tags view',
  'Templates',
  'Unique note creator',
  'Web viewer',
  'Word count',
  'Workspaces'
];

/** The longest description the directory accepts. */
export const MAX_DESCRIPTION_LENGTH = 250;

/** The shortest description that can plausibly say what a plugin does. */
export const MIN_DESCRIPTION_LENGTH = 10;

/** The only characters an `id` may hold. */
const ALLOWED_ID_CHARACTERS = /^[a-z0-9-]+$/;

/** Basic Latin letters and digits, spaces, and the three punctuation marks a `name` may use. */
const ALLOWED_NAME_CHARACTERS = /^[A-Za-z0-9 \-+()]+$/;

/** Anything the Unicode tables call a pictograph, which is what the directory means by an emoji. */
const EMOJI = /\p{Extended_Pictographic}/u;

/** `Obsidian` as a whole word, which is the shape the directory objects to in a description. */
const OBSIDIAN_WORD = /\bobsidian\b/i;

/** `Obsidian` and the two abbreviations of it the directory also rejects in a `name`. */
const OBSIDIAN_NAME_VARIANTS = /obsi|sidian/i;

/**
 * The phrasings the directory calls out as self-reference.
 *
 * A bare `plugin` is deliberately not among them: naming another plugin, or plugins in general, is not
 * referring to oneself, and two published descriptions do exactly that.
 */
const SELF_REFERENCE_PATTERNS = [
  /\bthis plugin\b/i,
  /\bthis is a plugin\b/i,
  /\ba plugin (?:that|which)\b/i,
  /^the plugin\b/i,
  /^plugin\b/i
];

/**
 * Reports what the Community directory would reject about a plugin description, or `undefined` if it
 * would accept it.
 */
export function validatePluginDescription(input: string | undefined): string | undefined {
  if (!input) {
    return 'Should not be empty';
  }

  if (EMOJI.test(input)) {
    return 'Should not contain emoji -- the Community directory rejects them, though it does accept ordinary punctuation such as backticks, em dashes and parentheses';
  }

  if (OBSIDIAN_WORD.test(input)) {
    return 'Should not contain the word "Obsidian" -- the Community directory rejects it as implied by the plugin directory, even though no Obsidian document says so';
  }

  if (SELF_REFERENCE_PATTERNS.some((pattern) => pattern.test(input))) {
    return 'Should say what the plugin does rather than refer to itself -- the Community directory rejects "This plugin..." and "a plugin that...". Naming another plugin is fine';
  }

  if (input.length < MIN_DESCRIPTION_LENGTH) {
    return `Should be at least ${String(MIN_DESCRIPTION_LENGTH)} characters, so it says what the plugin does`;
  }

  if (input.length > MAX_DESCRIPTION_LENGTH) {
    return `Should be at most ${String(MAX_DESCRIPTION_LENGTH)} characters -- the Community directory rejects a longer one`;
  }

  if (!/^[A-Z]/.test(input)) {
    return 'Should start with a capital letter, ideally on an action verb: "Translates selected text...", "Imports notes from..."';
  }

  if (!input.endsWith('.')) {
    return 'Should end with a dot';
  }

  return undefined;
}

/**
 * Reports what the Community directory would reject about a plugin id, or `undefined` if it would accept
 * it.
 *
 * The first two checks are the generator's own: the directory says nothing about which character an id
 * starts or ends on, but a leading or trailing hyphen is a typo every time.
 */
export function validatePluginId(input: string | undefined): string | undefined {
  if (!input) {
    return 'Should not be empty';
  }

  if (!ALLOWED_ID_CHARACTERS.test(input)) {
    return 'Should contain only lowercase English letters, digits and hyphens';
  }

  if (!/^[a-z]/.test(input)) {
    return 'Should start with a letter';
  }

  if (!/[a-z0-9]$/.test(input)) {
    return 'Should end with a letter or digit';
  }

  if (input.includes('obsidian')) {
    return 'Should not contain "obsidian" anywhere -- the Community directory rejects it as implied by the plugin directory, and an id can never be changed once the plugin is published';
  }

  if (input.endsWith('plugin')) {
    return 'Should not end with "plugin" -- the Community directory rejects it as implied, and an id can never be changed once the plugin is published';
  }

  return undefined;
}

/**
 * Reports what the Community directory would reject about a plugin display name, or `undefined` if it
 * would accept it.
 */
export function validatePluginName(input: string | undefined): string | undefined {
  if (!input) {
    return 'Should not be empty';
  }

  if (OBSIDIAN_NAME_VARIANTS.test(input)) {
    return 'Should not contain "Obsidian" or an abbreviation of it ("Obsi", "sidian") -- the Community directory rejects it as implied by the plugin directory';
  }

  if (input.toLowerCase().includes('plugin')) {
    return 'Should not contain "Plugin" -- the Community directory rejects it as implied by the plugin directory';
  }

  const coreName = findCoreFeatureName(input);
  if (coreName !== undefined) {
    return `Should not be the name of an Obsidian core plugin or core feature -- "${coreName}" is one, and the Community directory rejects a name that takes it`;
  }

  if (!ALLOWED_NAME_CHARACTERS.test(input)) {
    return 'Should use Basic Latin letters and digits only, with hyphens, plus signs and parentheses the only punctuation the Community directory accepts';
  }

  return undefined;
}

/** The core plugin or feature a name collides with, in its own spelling, or `undefined` if none does. */
function findCoreFeatureName(name: string): string | undefined {
  const normalized = name.trim().toLowerCase();
  return CORE_FEATURE_NAMES.find((candidate) => candidate.toLowerCase() === normalized);
}
