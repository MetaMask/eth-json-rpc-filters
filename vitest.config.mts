import { defineConfig } from 'vitest/config';

/**
 * For a detailed explanation of each option, visit:
 * https://vitest.dev/config/
 */
export default defineConfig({
  test: {
    // Vitest enables watch mode by default. We disable it here, so it can be
    // explicitly enabled with `yarn test:watch`.
    watch: false,

    include: ['tests/**/*.test.js'],

    // The ganache-backed tests mine blocks and poll for them.
    testTimeout: 30_000,

    mockReset: true,
    restoreMocks: true,

    coverage: {
      enabled: false,
      include: ['*.js'],
      exclude: ['vitest.config.mts'],
      reporter: ['text', 'html', 'json-summary', 'lcovonly'],

      // Floors set from the coverage at the time of the Vitest migration.
      thresholds: {
        branches: 65,
        functions: 71,
        lines: 78,
        statements: 76,
      },
    },
  },
});
