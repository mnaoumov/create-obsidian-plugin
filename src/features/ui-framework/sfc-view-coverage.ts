/**
 * Why the Svelte and Vue sample views are left out of the unit test coverage report.
 *
 * Both unit runners alias every `.svelte` / `.vue` import to `scripts/framework-component-stub.ts`, which throws, so
 * a unit test cannot get past the view's `mount`. That stub's contract is deliberate, and the `.tsx` views of the JSX
 * frameworks are already outside the `src/**\/*.ts` coverage glob, so the two `.ts` views are excluded the same way.
 */
export const SFC_VIEW_COVERAGE_REASON = 'Mounts a single-file component, which the unit runners stub: an integration test renders it.';
