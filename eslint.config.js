import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [{
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    globals: { chrome: 'readonly', document: 'readonly', window: 'readonly', globalThis: 'readonly', crypto: 'readonly', fetch: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' },
  },
  plugins: { '@typescript-eslint': tseslint },
  rules: { 'no-console': 'warn', 'no-unused-vars': 'off', '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }] },
  ignores: ['dist/**', 'node_modules/**'],
}];
