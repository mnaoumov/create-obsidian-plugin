import type { TemplateBuilder } from '../template-builder.ts';

import { isFrameworkPreset } from './preset/is-framework-preset.ts';

/**
 * Registers husky, which installs whatever hooks `.husky/` holds.
 *
 * Shared by the two things that need a hook: the commit-msg hook `conventional-commits` emits, and the
 * pre-commit hook {@link addStagedFilesHook} emits. Every call is idempotent, so a project that has both
 * gets one of each.
 */
export function addHusky(builder: TemplateBuilder): void {
  builder
    .addPackage('husky')
    .addDepcheckIgnore('husky', 'run as a CLI by `scripts/prepare.ts`; the hooks in `.husky/` are its output.')
    // Husky only writes the hooks into `.git/hooks` when its binary runs, which is what `prepare`
    // Is for -- npm runs that lifecycle script after every install. Without it the hook files were
    // Emitted, husky was installed, and no hook ever fired: a linter that silently lints nothing,
    // Which is precisely the class of failure this project's verification is built to refuse.
    .addScript('prepare')
    .addFiles(['scripts/prepare.ts']);
}

/**
 * Registers the pre-commit hook that runs nano-staged over the staged files.
 *
 * It belongs to whether any tool registered a staged-files command, not to the commit-linting answer:
 * `pre-commit` is about staged FILES and `commit-msg` about commit MESSAGES. `buildTemplate` calls it
 * exactly when {@link TemplateBuilder.lintStagedPatterns} is non-empty, so the hook can never run an
 * empty config.
 *
 * Where the toolkit's `getNanoStagedConfig()` runs exactly the tools the project has, the config is that
 * one call, as in every real plugin: it batches the paths to fit a Windows command line and spellchecks
 * what the writers rewrote. Anywhere else the commands the answers registered are written out inline.
 */
export function addStagedFilesHook(builder: TemplateBuilder, preset: string): void {
  addHusky(builder);
  builder.addPartial(usesToolkitNanoStagedConfig(builder, preset) ? 'toolkit-nano-staged' : 'inline-nano-staged');
  builder
    // `nano-staged` rather than `lint-staged`: the reference plugins moved to it, and `depend/ban-dependencies`
    // In the generated ESLint config bans `lint-staged` outright, so a project that installed it
    // Could not pass its own `npm run lint`.
    .addPackage('nano-staged')
    .addDepcheckIgnore('nano-staged', '`.husky/pre-commit` runs it; configured by `scripts/nano-staged-config.ts`.')
    .addFiles([
      '.husky/pre-commit',
      '.nano-staged.mjs',
      'scripts/nano-staged-config.ts'
    ]);
}

/**
 * The partials whose `npm run` scripts are the ones typescript-dev-toolkit's `getNanoStagedConfig()` calls,
 * each a toolkit runner that takes the staged paths: `lint:fix` (eslint), `format` (dprint),
 * `lint:md:fix` (markdownlint) and `spellcheck` (cspell). Its tasks are fixed, so a project missing any of
 * them would fail its first commit on a missing script, and prettier and biome run over the whole tree
 * whatever paths they are given.
 */
const TOOLKIT_NANO_STAGED_PARTIALS = ['cspell', 'dprint', 'eslint', 'markdownlint'] as const;

/**
 * Whether the project's staged-files config can be typescript-dev-toolkit's `getNanoStagedConfig()`.
 *
 * @param builder - The builder, after every answer and demo override has configured.
 * @param preset - The preset setting value.
 * @returns Whether the toolkit's config runs exactly the tools this project has.
 */
export function usesToolkitNanoStagedConfig(builder: TemplateBuilder, preset: string): boolean {
  const partials = builder.partials;
  return isFrameworkPreset(preset) && TOOLKIT_NANO_STAGED_PARTIALS.every((partial) => partials.has(partial));
}
