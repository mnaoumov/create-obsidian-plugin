/** Licenses recognized by a phrase of their text, so the notice names the license rather than its first line. */
const KNOWN_LICENSES: readonly (readonly [string, string])[] = [
  ['0BSD', 'Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.'],
  ['MIT', 'Permission is hereby granted, free of charge, to any person obtaining a copy']
];

/** The phrase that grants the license to the code examples alone, the rest of the repository staying proprietary. */
const CODE_EXAMPLES_EXCEPTION = 'Code examples contained in fenced code blocks are open source and licensed under';

const ALL_RIGHTS_RESERVED_PATTERN = /\s*All rights reserved\.?/i;

/**
 * The license notice the showcase writes into every module header and its README, read from upstream's `LICENSE`.
 *
 * Two shapes are recognized. A whole-repository license names the license and its copyright line. A `LICENSE` that
 * reserves all rights and licenses only the code examples in fenced code blocks, which is the one
 * obsidianmd/obsidian-developer-docs carries, names the license as applying to those code examples: the showcase
 * copies only code blocks, and copying its `All rights reserved` line would tell the reader the opposite. Anything
 * else throws, because a notice built from a license nobody read could misstate it.
 *
 * @param text - The text of upstream's `LICENSE`.
 * @param repo - The upstream repository, `<owner>/<name>`.
 * @returns The notice, completing `The code block is licensed under ...`, without a final period.
 */
export function describeUpstreamLicense(text: string, repo: string): string {
  const flatText = text.replaceAll(/\s+/g, ' ');
  const name = KNOWN_LICENSES.find(([, phrase]) => flatText.includes(phrase))?.[0];
  if (name === undefined) {
    throw new Error(`The LICENSE of ${repo} is not one the docs showcase recognizes. Read it and teach describeUpstreamLicense its shape.`);
  }

  const copyrightLine = text.split(/\r?\n/).map((line) => line.trim()).find((line) => /^Copyright\b/i.test(line)) ?? '';
  const reservesRights = ALL_RIGHTS_RESERVED_PATTERN.test(flatText);
  if (!reservesRights) {
    return copyrightLine === '' ? `${name}, the license of ${repo}` : `${name} (${copyrightLine}), the license of ${repo}`;
  }

  if (!flatText.includes(CODE_EXAMPLES_EXCEPTION) || copyrightLine === '') {
    throw new Error(`The LICENSE of ${repo} reserves all rights without the code-examples exception the docs showcase recognizes.`);
  }
  const copyright = copyrightLine
    .replace(ALL_RIGHTS_RESERVED_PATTERN, '')
    .replace(/^Copyright\s*\(c\)/i, 'Copyright (C)')
    .replaceAll(/[–—]/g, '-')
    .replace(/\.?$/, '.');
  return `${name} (code examples of ${repo}, ${copyright})`;
}
