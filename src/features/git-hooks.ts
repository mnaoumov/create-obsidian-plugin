import type { TemplateBuilder } from '../template-builder.ts';

import { isFrameworkPreset } from './preset/is-framework-preset.ts';

/**
 * The message of the scaffold's first commit, which the gate tier's `commit` step takes too.
 *
 * A conventional-commits header, because the commit goes through the project's own `commit-msg` hook: the
 * scaffold runs `prepare` after `git init`, so the hooks are live by then.
 */
export const INITIAL_COMMIT_MESSAGE = 'chore: initial commit from create-obsidian-plugin';

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
    // Is for -- npm runs that lifecycle script after every install, and the scaffold runs it once more
    // After its `git init`, which comes after the install. Without it the hook files were
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
 * On the framework presets the config is the toolkit's `getNanoStagedConfig()`, as in every real plugin: it
 * batches the paths to fit a Windows command line and spellchecks what the writers rewrote. `standalone`
 * writes out the commands the answers registered.
 */
export function addStagedFilesHook(builder: TemplateBuilder, preset: string): void {
  addHusky(builder);
  builder.addPartial(usesToolkitNanoStagedConfig(preset) ? 'toolkit-nano-staged' : 'inline-nano-staged');
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
 * Whether the project's staged-files config can be typescript-dev-toolkit's `getNanoStagedConfig()`.
 *
 * It can on every framework preset: since typescript-dev-toolkit 3.2.0 the config leaves out a task whose
 * script the project lacks, and every framework format and lint script is a toolkit runner that takes the
 * staged paths, whichever tool it runs. `standalone` depends on no toolkit, so it writes its commands out.
 *
 * @param preset - The preset setting value.
 * @returns Whether the toolkit's config is the project's.
 */
export function usesToolkitNanoStagedConfig(preset: string): boolean {
  return isFrameworkPreset(preset);
}
