/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      indent: ['error', 2],
      'spaced-comment': ['error', 'always'],
      semi: ['error', 'never']
    }
  }
];
