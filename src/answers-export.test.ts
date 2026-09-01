import {
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterAll,
  describe,
  expect,
  it
} from 'vitest';

import type { Shell } from './answers-export.ts';
import type { Answers } from './answers.ts';

import {
  formatAnswersJson,
  formatCreateCommand,
  formatCreateScript,
  getExportableKeys,
  getScriptExtension,
  getShellForPlatform
} from './answers-export.ts';
import { parseCliArgs } from './cli-args.ts';
import { getDefaultAnswers } from './prompts.ts';

/**
 * A value carrying every character the two quoting schemes have to survive.
 *
 * The `%` is the one that matters most: a batch file expands `%…%` as a variable, so an undoubled one
 * silently eats part of the value. Real funding and badge URLs are percent-encoded, so this is not a
 * hypothetical.
 */
const NASTY = 'a b%c\'d"e&f=g%%h';

const tempDir = mkdtempSync(join(tmpdir(), 'cop-answers-export-'));

afterAll(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

function expectedAnswers(answers: Answers): Record<string, string> {
  const expected: Record<string, string> = {};
  for (const key of getExportableKeys(answers)) {
    expected[key] = String(answers[key as keyof Answers]);
  }
  return expected;
}

function flagsFrom(tokens: readonly string[]): string[] {
  return tokens.filter((token) => token.startsWith('--') && token.includes('='));
}

function roundTrip(answers: Answers, shell: Shell): Record<string, string> {
  const command = formatCreateCommand(answers, shell);
  const tokens = shell === 'cmd' ? tokenizeCmd(command) : tokenizeSh(command);
  return parseCliArgs(flagsFrom(tokens)).answers as Record<string, string>;
}

/** Inverts the `cmd` half of `quote`: double quotes around the value, `""` for one, `%%` for a `%`. */
function tokenizeCmd(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let started = false;

  for (let i = 0; i < command.length; i++) {
    const character = command[i];
    if (character === '"') {
      if (inQuote && command[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      started = true;
      continue;
    }
    if (!inQuote && character === ' ') {
      if (started) {
        tokens.push(current);
        current = '';
        started = false;
      }
      continue;
    }
    current += character ?? '';
    started = true;
  }

  if (started) {
    tokens.push(current);
  }
  return tokens.map((token) => token.replaceAll('%%', '%'));
}

/** Inverts the `sh` half of `quote`: single quotes, with `'\''` splicing in a literal quote. */
function tokenizeSh(command: string): string[] {
  const joined = command.replaceAll('\\\n', ' ');
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let started = false;

  for (let i = 0; i < joined.length; i++) {
    const character = joined[i];
    if (inQuote) {
      if (character === '\'') {
        inQuote = false;
      } else {
        current += character ?? '';
      }
      continue;
    }
    if (character === '\'') {
      inQuote = true;
      started = true;
      continue;
    }
    if (character === '\\') {
      current += joined[i + 1] ?? '';
      i++;
      started = true;
      continue;
    }
    if (character === ' ' || character === '\n') {
      if (started) {
        tokens.push(current);
        current = '';
        started = false;
      }
      continue;
    }
    current += character ?? '';
    started = true;
  }

  if (started) {
    tokens.push(current);
  }
  return tokens;
}

describe('round-tripping the exported answers', () => {
  // The invariant that keeps the exporter and the parser from drifting apart. Both script forms are
  // Generated and checked whatever this machine runs, so the one that does not ship here is still
  // Covered -- only the choice of which to WRITE is platform-dependent.
  const shells: Shell[] = ['cmd', 'sh'];

  for (const shell of shells) {
    it(`reads back what it wrote, for ${shell}`, () => {
      const answers = getDefaultAnswers({ pluginId: 'my-plugin', pluginName: 'My Plugin' });
      expect(roundTrip(answers, shell)).toStrictEqual(expectedAnswers(answers));
    });

    it(`survives quoting hazards, for ${shell}`, () => {
      const answers = getDefaultAnswers({ authorName: NASTY, pluginId: 'my-plugin' });
      expect(roundTrip(answers, shell)['authorName']).toBe(NASTY);
    });

    it(`survives an empty presence-branch answer, for ${shell}`, () => {
      const answers = getDefaultAnswers({ fundingUrl: '', obsidianConfigFolder: '', pluginId: 'my-plugin' });
      const parsed = roundTrip(answers, shell);
      expect(parsed['fundingUrl']).toBe('');
      expect(parsed['obsidianConfigFolder']).toBe('');
    });

    it(`emits a command the CLI accepts under preset=demo, for ${shell}`, () => {
      const answers = getDefaultAnswers({ pluginId: 'my-plugin', preset: 'demo' });
      const parsed = roundTrip(answers, shell);
      expect(parsed['preset']).toBe('demo');
      expect(parsed['bundler']).toBeUndefined();
      expect(parsed['uiFramework']).toBeUndefined();
    });
  }

  it('reads back the answers file it wrote', () => {
    const answers = getDefaultAnswers({ authorName: NASTY, pluginId: 'my-plugin' });
    const path = join(tempDir, 'answers.json');
    writeFileSync(path, formatAnswersJson(answers));
    expect(parseCliArgs([`--answersFile=${path}`]).answers).toStrictEqual(expectedAnswers(answers));
  });
});

describe('the emitted command', () => {
  it('passes --yes, so the run is actually non-interactive', () => {
    const answers = getDefaultAnswers({ pluginId: 'my-plugin' });
    expect(formatCreateCommand(answers, 'sh')).toContain('--yes');
  });

  // Npm needs `--` to hand flags to the initializer; the other three forward them directly.
  it('uses each package manager\'s own create form', () => {
    expect(formatCreateCommand(getDefaultAnswers({ packageManager: 'npm' }), 'sh'))
      .toContain('npm create @mnaoumov/obsidian-plugin -- --yes');
    expect(formatCreateCommand(getDefaultAnswers({ packageManager: 'pnpm' }), 'sh'))
      .toContain('pnpm create @mnaoumov/obsidian-plugin --yes');
    expect(formatCreateCommand(getDefaultAnswers({ packageManager: 'yarn' }), 'sh'))
      .toContain('yarn create @mnaoumov/obsidian-plugin --yes');
    expect(formatCreateCommand(getDefaultAnswers({ packageManager: 'bun' }), 'sh'))
      .toContain('bun create @mnaoumov/obsidian-plugin --yes');
  });

  // `cmd`'s `^` continuation is silently broken by one trailing space, so the batch form stays on one
  // Line and only the shell form is wrapped.
  it('wraps the sh form and keeps the cmd form on one line', () => {
    const answers = getDefaultAnswers({ pluginId: 'my-plugin' });
    expect(formatCreateCommand(answers, 'sh')).toContain(' \\\n  ');
    expect(formatCreateCommand(answers, 'cmd')).not.toContain('\n');
  });

  it('doubles a percent sign for cmd and leaves it alone for sh', () => {
    const answers = getDefaultAnswers({ fundingUrl: 'https://example.com/a%20b', pluginId: 'my-plugin' });
    expect(formatCreateCommand(answers, 'cmd')).toContain('a%%20b');
    expect(formatCreateCommand(answers, 'sh')).toContain('a%20b');
  });
});

describe('the emitted script', () => {
  it('gives the sh form a shebang and LF endings', () => {
    const script = formatCreateScript(getDefaultAnswers({ pluginId: 'my-plugin' }), 'sh');
    expect(script.startsWith('#!/usr/bin/env sh\nset -e\n')).toBe(true);
    expect(script).not.toContain('\r');
  });

  it('gives the cmd form @echo off and CRLF endings', () => {
    const script = formatCreateScript(getDefaultAnswers({ pluginId: 'my-plugin' }), 'cmd');
    expect(script.startsWith('@echo off\r\n')).toBe(true);
    expect(script.split('\n').every((line) => line === '' || line.endsWith('\r'))).toBe(true);
  });

  it('picks the script form from the platform', () => {
    expect(getShellForPlatform('win32')).toBe('cmd');
    expect(getShellForPlatform('linux')).toBe('sh');
    expect(getShellForPlatform('darwin')).toBe('sh');
    expect(getScriptExtension('cmd')).toBe('.cmd');
    expect(getScriptExtension('sh')).toBe('.sh');
  });
});
