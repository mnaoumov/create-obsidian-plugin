import type { TemplateBuilder } from '../template-builder.ts';

/**
 * The scripts obsidian-dev-utils' `gate()` runs through `npmRun` rather than `npmRunOptional`: it throws
 * `Command <name> is not defined in the package.json` on the first one a project lacks.
 */
const GATE_REQUIRED_SCRIPTS = ['format:check', 'spellcheck', 'lint:md', 'build', 'lint'] as const;

/**
 * Registers `npm run gate`: the checks the release preflight runs, reachable before committing. Every
 * plugin compared here ships this exact one-line wrapper over obsidian-dev-utils' `gate()`.
 *
 * `buildTemplate` calls it after every answer and demo override has configured, and it emits the gate only
 * on a dev-utils preset whose answers registered every script `gate()` requires. A project that answered `none`
 * for the formatter, the spell checker, the markdown linter or the linter would otherwise get a gate that
 * dies on its first step, which is a command that has never once passed.
 */
export function addBranchGate(builder: TemplateBuilder): void {
  if (!builder.partials.has('dev-utils')) {
    return;
  }

  if (!GATE_REQUIRED_SCRIPTS.every((script) => script in builder.scripts)) {
    return;
  }

  builder
    .addScript('gate')
    .addFiles(['scripts/gate.ts'])
    .addPartial('has-gate');
}
