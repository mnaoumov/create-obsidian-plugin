import {
  describe,
  expect,
  it
} from 'vitest';

import { answersAtOrdinal } from './answer-space.ts';
import {
  CORE_FEATURE_NAMES,
  MAX_DESCRIPTION_LENGTH,
  validatePluginDescription,
  validatePluginId,
  validatePluginName
} from './directory-constraints.ts';
import { getDefaultAnswers } from './prompts.ts';

/** A description one character past the cap, built rather than typed out. */
const OVER_LONG_DESCRIPTION = `Does ${'a'.repeat(MAX_DESCRIPTION_LENGTH)}.`;

describe('the plugin id', () => {
  it('accepts an ordinary id', () => {
    expect(validatePluginId('custom-attachment-location')).toBeUndefined();
  });

  // `startsWith('obsidian-')` was the check before this, which let both of these through. The directory
  // Rejects `obsidian` anywhere, and an id can never be changed once the plugin is published.
  it('refuses "obsidian" anywhere, not only as a prefix', () => {
    expect(validatePluginId('obsidian-helper')).toMatch(/not contain "obsidian"/);
    expect(validatePluginId('my-obsidian-helper')).toMatch(/not contain "obsidian"/);
    expect(validatePluginId('helper-for-obsidian')).toMatch(/not contain "obsidian"/);
  });

  it('refuses a trailing "plugin"', () => {
    expect(validatePluginId('my-plugin')).toMatch(/not end with "plugin"/);
    expect(validatePluginId('plugin-manager')).toBeUndefined();
  });

  it('keeps the shape checks it already had', () => {
    expect(validatePluginId('')).toMatch(/not be empty/);
    expect(validatePluginId('My_Plugin')).toMatch(/lowercase English letters/);
    expect(validatePluginId('-helper')).toMatch(/start with a letter/);
    expect(validatePluginId('helper-')).toMatch(/end with a letter or digit/);
  });
});

describe('the plugin name', () => {
  it('accepts an ordinary name', () => {
    expect(validatePluginName('Custom Attachment Location')).toBeUndefined();
    expect(validatePluginName('Smart Rename (2)')).toBeUndefined();
    expect(validatePluginName('A+B Merge')).toBeUndefined();
  });

  it('refuses "Obsidian" and the two abbreviations of it', () => {
    expect(validatePluginName('Obsidian Helper')).toMatch(/not contain "Obsidian"/);
    expect(validatePluginName('Obsi Helper')).toMatch(/not contain "Obsidian"/);
    expect(validatePluginName('Notesidian')).toMatch(/not contain "Obsidian"/);
  });

  it('refuses "Plugin" in any case', () => {
    expect(validatePluginName('My Plugin')).toMatch(/not contain "Plugin"/);
    expect(validatePluginName('my plugin')).toMatch(/not contain "Plugin"/);
  });

  // The match is on the WHOLE name: a name containing a core one is ordinary and common.
  it('refuses a core plugin or core feature name, and only an exact one', () => {
    expect(validatePluginName('Bases')).toMatch(/core plugin or core feature/);
    expect(validatePluginName('live preview')).toMatch(/core plugin or core feature/);
    expect(validatePluginName('Note composer')).toMatch(/core plugin or core feature/);
    expect(validatePluginName('Better Search')).toBeUndefined();
    expect(validatePluginName('Canvas Randomizer')).toBeUndefined();
  });

  it('names the core feature it collided with, in that feature\'s own spelling', () => {
    expect(validatePluginName('note composer')).toContain('"Note composer"');
  });

  it('refuses punctuation the directory does not accept', () => {
    expect(validatePluginName('Notes & Tasks')).toMatch(/Basic Latin/);
    expect(validatePluginName('Tasks!')).toMatch(/Basic Latin/);
    expect(validatePluginName('Café Notes')).toMatch(/Basic Latin/);
    expect(validatePluginName('')).toMatch(/not be empty/);
  });

  it('holds no core name that its own checks would reject for another reason', () => {
    for (const name of CORE_FEATURE_NAMES) {
      expect(validatePluginName(name), name).toMatch(/core plugin or core feature/);
    }
  });
});

describe('the plugin description', () => {
  it('accepts an ordinary description', () => {
    expect(validatePluginDescription('Places attachments in a configurable folder.')).toBeUndefined();
  });

  it('refuses self-reference, which is what the directory objects to', () => {
    expect(validatePluginDescription('This plugin does things.')).toMatch(/refer to itself/);
    expect(validatePluginDescription('A plugin that does things.')).toMatch(/refer to itself/);
    expect(validatePluginDescription('This is a plugin for notes.')).toMatch(/refer to itself/);
  });

  // Both of these are published and both passed the directory's review untouched, because each names
  // Something other than itself. Upstream's rule bans the bare substring and would reject them.
  it('accepts a description that names ANOTHER plugin', () => {
    expect(validatePluginDescription('Enhances Note composer core plugin.')).toBeUndefined();
    expect(validatePluginDescription('Notifies about app updates, not plugin updates.')).toBeUndefined();
  });

  it('refuses the word "Obsidian", which no Obsidian document forbids', () => {
    expect(validatePluginDescription('Indexes Obsidian notes.')).toMatch(/not contain the word "Obsidian"/);
    expect(validatePluginDescription('Indexes obsidian notes.')).toMatch(/not contain the word "Obsidian"/);
  });

  it('refuses emoji, and only emoji', () => {
    expect(validatePluginDescription('Renders notes 🎉 faster.')).toMatch(/not contain emoji/);
  });

  // Seven live listings carry these and the directory flagged none, so there is no character whitelist.
  it('accepts backticks, em dashes, parentheses, colons and slashes', () => {
    expect(validatePluginDescription('Adds a `code-button` block — run it inline.')).toBeUndefined();
    expect(validatePluginDescription('Splits notes: by heading, by block, or by line/paragraph.')).toBeUndefined();
  });

  it('enforces the length, the capital and the dot', () => {
    expect(validatePluginDescription('')).toMatch(/not be empty/);
    expect(validatePluginDescription('Adds it.')).toMatch(/at least/);
    expect(validatePluginDescription(OVER_LONG_DESCRIPTION)).toMatch(/at most 250 characters/);
    expect(validatePluginDescription('renames notes safely.')).toMatch(/capital letter/);
    expect(validatePluginDescription('Renames notes safely')).toMatch(/end with a dot/);
  });
});

// The generator's own answers are the ones most likely to reach the directory: the `--yes` path ships
// Them verbatim, and every verified case is generated from the fixture. They were `my-awesome-plugin` /
// `My Awesome Plugin` and `my-plugin` / `My Plugin`, all four of which the directory rejects.
describe('the answers the generator supplies itself', () => {
  it('passes its own defaults', () => {
    const answers = getDefaultAnswers();
    expect(validatePluginId(answers.pluginId)).toBeUndefined();
    expect(validatePluginName(answers.pluginName)).toBeUndefined();
    expect(validatePluginDescription(answers.pluginDescription)).toBeUndefined();
  });

  it('passes the verification fixture every generated case is built from', () => {
    const answers = answersAtOrdinal(0);
    expect(validatePluginId(answers.pluginId)).toBeUndefined();
    expect(validatePluginName(answers.pluginName)).toBeUndefined();
    expect(validatePluginDescription(answers.pluginDescription)).toBeUndefined();
  });
});
