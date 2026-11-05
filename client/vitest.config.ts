import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      // Page tests render real lazy routes and wait on several async steps (see test/setup.ts).
      testTimeout: 15_000,
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  }),
);
