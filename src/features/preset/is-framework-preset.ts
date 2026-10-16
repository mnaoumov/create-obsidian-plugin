const FRAMEWORK_PRESETS = new Set(['all-in-one', 'demo', 'docs-showcase']);

/**
 * Whether a preset builds on `@mnaoumov/obsidian-lib` and the `@mnaoumov` toolkits.
 *
 * Only these presets get the shared `framework` partial, the release flow that archives `demo-vault/` into the
 * GitHub release, and the demo-vault test suites.
 *
 * @param preset - The preset setting value.
 * @returns Whether the preset depends on the `@mnaoumov` packages.
 */
export function isFrameworkPreset(preset: string): boolean {
  return FRAMEWORK_PRESETS.has(preset);
}
