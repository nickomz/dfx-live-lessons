import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, isPreview }) => ({
  // En GitHub Pages la app vive en nickomz.github.io/dfx-live-lessons/.
  base: command === 'build' || isPreview ? '/dfx-live-lessons/' : '/',
  test: {
    include: ['tests/**/*.test.ts'],
  },
}));
