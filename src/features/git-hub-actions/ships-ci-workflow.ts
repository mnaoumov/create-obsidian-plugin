const CI_ANSWERS = new Set(['ci', 'ci-and-release']);

/**
 * Whether the `gitHubActions` answer emits `.github/workflows/ci.yml`, which runs on pushes to the default branch.
 *
 * @param gitHubActions - The `gitHubActions` setting value.
 * @returns Whether the project ships a CI workflow.
 */
export function shipsCiWorkflow(gitHubActions: string): boolean {
  return CI_ANSWERS.has(gitHubActions);
}
