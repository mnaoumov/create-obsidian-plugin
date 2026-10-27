import { defineConfig } from 'vitest/config';

const TEST_TIMEOUT_MILLISECONDS = 30_000;

export const vitestConfig = defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@obsidian-typings']
      }
    },
    // Many cases render several whole projects synchronously. On an idle machine the slowest takes about 1 s,
    // But under a loaded one they ran past vitest's 5 s default and failed as timeouts, a different case each time.
    // Nothing a case awaits can hang for real, so the margin costs no signal.
    testTimeout: TEST_TIMEOUT_MILLISECONDS
  }
});
