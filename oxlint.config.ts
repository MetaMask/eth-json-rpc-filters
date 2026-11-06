import base, { createConfig } from '@metamask/oxlint-config';
import nodejs from '@metamask/oxlint-config-nodejs';
import typescript from '@metamask/oxlint-config-typescript';
import vitest from '@metamask/oxlint-config-vitest';

export default createConfig({
  extends: [base],

  ignorePatterns: ['**/coverage/**', '**/dist/**', '**/docs/**', '.yarn/**'],

  options: {
    typeAware: true,
  },

  overrides: [
    {
      files: ['**/*.ts', '**/*.mts', '**/*.cts'],
      extends: [typescript],
      rules: {
        // TODO: Auto-fix breaks stuff.
        'typescript/promise-function-async': 'off',
      },
    },

    {
      files: ['tests/**', 'vitest.config.mts'],
      extends: [nodejs, vitest],
      plugins: ['typescript'],
      rules: {
        'node/no-sync': 'off',
        'node/no-process-env': 'off',
        'n/no-unsupported-features/node-builtins': 'off',
        'typescript/no-unsafe-assignment': 'off',
      },
    },
  ],
});
