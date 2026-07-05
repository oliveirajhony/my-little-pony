import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Nest relies on legacy decorators + emitted metadata at runtime. The swc
// plugin compiles the specs preserving that metadata (the same job ts-jest/swc
// does in Nest's default jest preset), so controllers/providers behave as they
// do in production.
export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/api',
  plugins: [swc.vite()],
  test: {
    name: '@my-little-pony/api',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
  },
});
