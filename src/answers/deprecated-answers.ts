import { log } from '@clack/prompts';

/**
 * Answer values that were renamed, each mapped to the value that replaced it.
 *
 * One table for every way an answer arrives -- a flag, an answers file, and a saved
 * `.create-obsidian-plugin.json` -- so an old value keeps working wherever it was written down. The renamed
 * value is what reaches `ANSWER_SPACE`, so nothing past this point ever sees the old one.
 */
const DEPRECATED_ANSWER_VALUES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  preset: {
    enhanced: 'all-in-one'
  }
};

/**
 * The current value for an answer, warning once when the given one is a deprecated alias.
 *
 * @param key - The answer key.
 * @param value - The answer value as supplied.
 * @param source - Where the value came from, named in the warning.
 * @returns The value to use.
 */
export function resolveDeprecatedAnswer(key: string, value: string, source: string): string {
  const replacement = DEPRECATED_ANSWER_VALUES[key]?.[value];
  if (replacement === undefined) {
    return value;
  }
  log.warn(`${key} "${value}" in ${source} is deprecated and was read as "${replacement}". Use "${replacement}" instead.`);
  return replacement;
}
