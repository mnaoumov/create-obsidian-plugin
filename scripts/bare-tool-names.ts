/**
 * Finds a command, tool, library, package or service named in Markdown prose without backticks.
 *
 * The names are `TOOL_NAMES` (`./tool-names.ts`), each matched exactly as spelled there, so a name that is also an
 * ordinary word is found only in the case that is not. A name glued to a path, a scope, a file extension or a
 * longer hyphenated name (`vite.config.ts`, `@rollup/plugin-babel`, `eslint-plugin-obsidianmd`) is not the name
 * alone and is not reported. Skipped: front matter, fenced code, inline code, headings (code there would change
 * the anchor), link labels and destinations, autolinks, HTML tags, EJS tags, and quoted text, which stays as it
 * was written (a heading named in quotes has to match the heading).
 */

import { TOOL_NAMES } from './tool-names.ts';

/** A bare tool name, with its 1-based line and 0-based column. */
export interface BareToolName {
  readonly column: number;
  readonly line: number;
  readonly name: string;
  readonly text: string;
}

/**
 * The pattern that finds any of `names` standing alone: not glued to a path, a scope, a file extension or a longer
 * hyphenated name. The longest name is tried first, so `GitHub Actions` wins over `GitHub`.
 */
function buildPattern(names: readonly string[]): RegExp {
  const alternatives = [...names]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return new RegExp(`(?<![\\w./@\\\\-])(?<Name>${alternatives})(?![\\w/@\\\\-]|\\.\\w)`, 'g');
}

const TOOL_NAME_PATTERN = buildPattern(TOOL_NAMES);

const FENCE_PATTERN = /^\s*(?:```|~~~)/;

const BACKTICKS_PER_SPAN = 2;

/**
 * Every bare tool name in a Markdown document.
 *
 * @param markdown - The document.
 * @param names - The spellings to look for; `TOOL_NAMES` by default.
 * @returns The bare names, in document order.
 */
export function findBareToolNames(markdown: string, names?: readonly string[]): BareToolName[] {
  const pattern = names === undefined ? TOOL_NAME_PATTERN : buildPattern(names);
  const found: BareToolName[] = [];
  const lines = blankEjsTags(markdown).split(/\r?\n/);
  const originalLines = markdown.split(/\r?\n/);
  let inFence = false;
  let inFrontMatter = lines[0] === '---';
  // An inline code span may wrap onto the next line, so an unclosed backtick carries over.
  let inCodeSpan = false;

  for (const [index, line] of lines.entries()) {
    if (inFrontMatter) {
      if (index > 0 && line === '---') {
        inFrontMatter = false;
      }
      continue;
    }
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || /^\s*#/.test(line)) {
      continue;
    }

    let text = line;
    if (inCodeSpan) {
      const close = text.indexOf('`');
      if (close === -1) {
        continue;
      }
      text = ' '.repeat(close + 1) + text.slice(close + 1);
      inCodeSpan = false;
    }
    const backticks = text.split('`').length - 1;
    if (backticks % BACKTICKS_PER_SPAN === 1) {
      const open = text.lastIndexOf('`');
      text = text.slice(0, open) + ' '.repeat(text.length - open);
      inCodeSpan = true;
    }

    const prose = stripNonProse(text);
    for (const match of prose.matchAll(pattern)) {
      found.push({ column: match.index, line: index + 1, name: match.groups?.['Name'] ?? '', text: (originalLines[index] ?? '').trim() });
    }
  }

  return found;
}

/**
 * Blanks out every EJS tag, which may hold `>`, keeping every column where it was. A tag is closed on its own
 * line: a `<%` quoted in prose would otherwise run on to the next `%>` and blank a whole section.
 */
function blankEjsTags(markdown: string): string {
  return markdown.replace(/<%[^\r\n]*?%>/g, (tag) => ' '.repeat(tag.length));
}

/** Blanks out everything on the line that is not prose, keeping every column where it was. */
function stripNonProse(line: string): string {
  function blank(text: string): string {
    return ' '.repeat(text.length);
  }
  return line
    .replace(/`[^`]*`/g, blank)
    .replace(/<[^>]*>/g, blank)
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, blank)
    .replace(/\[[^\]]*\]/g, blank)
    .replace(/"[^"]*"|“[^”]*”/g, blank);
}
