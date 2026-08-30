import { defineConfig } from 'vitest/config';

export const vitestConfig = defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@obsidian-typings', 'obsidian-dev-utils']
      }
    }
  }
});
