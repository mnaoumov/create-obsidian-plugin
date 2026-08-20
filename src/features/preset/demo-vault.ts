/**
 * The starter demo vault every obsidian-dev-utils preset ships.
 *
 * `obsidian-dev-utils` archives `demo-vault/` into the GitHub release at version time, injecting the
 * freshly built plugin and the `demo-vault-helper` bootstrap plugin into the archived copy. Only the
 * presets that depend on `obsidian-dev-utils` get a vault, because only they have the release flow that
 * does the injecting — a `standalone` project would ship a vault that never reaches a release.
 */
export const DEMO_VAULT_TEMPLATE_FILES = [
  'demo-vault/.gitignore',
  'demo-vault/.obsidian/app.json',
  'demo-vault/.obsidian/community-plugins.json',
  'demo-vault/00 Start.md',
  'demo-vault/01 Sample commands.md',
  'demo-vault/02 Settings.md',
  'demo-vault/Materials/01 Sample commands/Scratch note.md',
  'demo-vault/README.md',
  'demo-vault/_assets/CodeScriptToolkit/demoSetup.ts',
  'demo-vault/_assets/CodeScriptToolkit/startup.ts'
];
