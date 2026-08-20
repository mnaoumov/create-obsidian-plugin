const ODU_PRESETS = new Set(['demo', 'enhanced']);

/**
 * Whether a preset builds on `obsidian-dev-utils`.
 *
 * Only these presets get the shared `odu` partial, the release flow that archives `demo-vault/` into the
 * GitHub release, and the demo-vault test suites.
 *
 * @param preset - The preset setting value.
 * @returns Whether the preset depends on `obsidian-dev-utils`.
 */
export function isOduPreset(preset: string): boolean {
  return ODU_PRESETS.has(preset);
}
