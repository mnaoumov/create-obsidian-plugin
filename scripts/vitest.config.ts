import { defineConfig } from 'vitest/config';

export const vitestConfig = defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
  },
});
