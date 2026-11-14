import type { TemplateBuilder } from '../../template-builder.ts';

/**
 * The starter demo vault every toolkit preset ships.
 *
 * `@mnaoumov/obsidian-dev-toolkit` archives `demo-vault/` into the GitHub release at version time, injecting the
 * freshly built plugin and the `demo-vault-helper` bootstrap plugin into the archived copy. Only the
 * presets built on that toolkit get a vault, because only they have the release flow that
 * does the injecting — a `standalone` project would ship a vault that never reaches a release.
 */
export const DEMO_VAULT_TEMPLATE_FILES = [
  'demo-vault/.gitignore',
  'demo-vault/.obsidian/app.json',
  'demo-vault/.obsidian/community-plugins.json',
  'demo-vault/00 Start.md',
  'demo-vault/01 Sample commands.md',
  'demo-vault/02 Settings.md',
  'demo-vault/README.md',
  'demo-vault/_assets/CodeScriptToolkit/demoSetup.ts',
  'demo-vault/_assets/CodeScriptToolkit/startup.ts',
  'demo-vault/_assets/CodeScriptToolkit/tsconfig.json'
];

/**
 * Registers the starter demo vault: its files, and the typings its setup code is type-checked against.
 *
 * The setup code runs inside Obsidian through `CodeScript Toolkit`, not inside the plugin, so the plugin's
 * `apiSubset` answer does not bind it: running a command needs `app.commands`, which only `obsidian-typings`
 * declares. The vault's own `tsconfig.json` names those typings, so the plugin's program still sees only the API
 * subset that was chosen.
 *
 * @param builder - The template builder.
 */
export function configureDemoVault(builder: TemplateBuilder): void {
  builder
    .addPackage('@obsidian-typings/obsidian-public-latest')
    .addFiles(DEMO_VAULT_TEMPLATE_FILES);
}
