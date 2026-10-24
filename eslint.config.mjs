import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**', '**/coverage/**', '**/cypress/screenshots/**', '**/cypress/videos/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/e2e/cypress/**/*.ts'],
    languageOptions: { globals: { cy: 'readonly', Cypress: 'readonly', expect: 'readonly', describe: 'readonly', it: 'readonly', beforeEach: 'readonly' } },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
);
