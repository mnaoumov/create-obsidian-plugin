import {
  describe,
  expect,
  it
} from 'vitest';

import { describeUpstreamLicense } from './upstream-license.ts';

const REPO = 'obsidianmd/obsidian-developer-docs';

const ZERO_BSD_BODY = [
  'Permission to use, copy, modify, and/or distribute this software for',
  'any purpose with or without fee is hereby granted.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES.'
];

describe('describeUpstreamLicense', () => {
  it('names the code examples, not the reserved rights, for a LICENSE that licenses only fenced code blocks', () => {
    const text = [
      'Copyright (c) 2020–2026 Dynalist Inc. All rights reserved.',
      '',
      'Except as noted below, all content in this repository, including documentation, text, and images, is proprietary and is not licensed for reuse.',
      '',
      'Exception: Code examples contained in fenced code blocks are open source and licensed under the BSD Zero Clause License (0BSD), reproduced below.',
      '',
      '---',
      '',
      'BSD Zero Clause License',
      '',
      ...ZERO_BSD_BODY
    ].join('\n');

    expect(describeUpstreamLicense(text, REPO)).toBe('0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.)');
  });

  it('names the license and its copyright line for a whole-repository license', () => {
    const text = ['BSD Zero Clause License', '', 'Copyright (C) 2020-2025 by Dynalist Inc.', '', ...ZERO_BSD_BODY].join('\r\n');

    expect(describeUpstreamLicense(text, REPO)).toBe('0BSD (Copyright (C) 2020-2025 by Dynalist Inc.), the license of obsidianmd/obsidian-developer-docs');
  });

  it('throws on a license it does not recognize rather than copying a line of it', () => {
    expect(() => describeUpstreamLicense('Apache License\nVersion 2.0, January 2004', REPO)).toThrow(/not one the docs showcase recognizes/);
  });

  it('throws on a LICENSE that reserves all rights without the code-examples exception', () => {
    const text = ['Copyright (c) 2026 Dynalist Inc. All rights reserved.', '', ...ZERO_BSD_BODY].join('\n');

    expect(() => describeUpstreamLicense(text, REPO)).toThrow(/reserves all rights/);
  });
});
