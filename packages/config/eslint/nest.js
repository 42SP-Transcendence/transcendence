import globals from 'globals';
import tseslint from 'typescript-eslint';

import base from './base.js';
import layers from './layers.js';

export default tseslint.config(
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  ...layers,
);
