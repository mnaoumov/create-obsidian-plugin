/**
 * Finds a command-line tool named in Markdown prose without backticks.
 *
 * `npm`, `pnpm`, `yarn`, `bun`, `npx`, `node` and `git` are what a reader types, and three of them are ordinary
 * English words, so prose marks them as code. Only lowercase is matched: `Node.js` the project and `Git` at the
 * start of a sentence about the system are names, not commands. Skipped: front matter, fenced code, inline code,
 * headings (code there would change the anchor), link labels and destinations, autolinks and HTML tags.
 */

/** A bare tool name, with its 1-based line and 0-based column. */
export interface BareToolName {
  readonly column: number;
  readonly line: number;
  readonly name: string;
  readonly text: string;
}

const TOOL_NAME_PATTERN = /(?<![\w./@\\-])(?<Name>npm|pnpm|yarn|bun|npx|node|git)(?![\w/@\\-]|\.\w)/g;

const FENCE_PATTERN = /^\s*(?:```|~~~)/;

const BACKTICKS_PER_SPAN = 2;

/**
 * Every bare tool name in a Markdown document.
 *
 * @param markdown - The document.
 * @returns The bare names, in document order.
 */
export function findBareToolNames(markdown: string): BareToolName[] {
  const found: BareToolName[] = [];
  const lines = markdown.split(/\r?\n/);
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
    for (const match of prose.matchAll(TOOL_NAME_PATTERN)) {
      found.push({ column: match.index, line: index + 1, name: match.groups?.['Name'] ?? '', text: line.trim() });
    }
  }

  return found;
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
    .replace(/\[[^\]]*\]/g, blank);
}
