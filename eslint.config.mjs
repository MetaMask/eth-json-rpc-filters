import base, { createConfig } from '@metamask/eslint-config';
import nodejs from '@metamask/eslint-config-nodejs';

const config = createConfig([
  {
    ignores: ['dist/', 'docs/', '.yarn/'],
  },

  {
    extends: base,

    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.json'],
      },
    },

    settings: {
      'import-x/extensions': ['.js', '.mjs'],
    },
  },

  {
    files: ['**/*.js', '**/*.cjs'],
    extends: nodejs,

    languageOptions: {
      sourceType: 'script',
    },
  },

  {
    files: ['**/*.test.js', 'test/**'],
    extends: [nodejs],
    rules: {
      // Tape uses `t` as the parameter inside of test functions
      'id-length': 'off',
    },
  },
]);

export default config;
