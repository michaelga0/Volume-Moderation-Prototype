import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      indent: ['error', 'tab']
    }
  },
  {
    languageOptions: { globals: globals.browser }
  }
];
