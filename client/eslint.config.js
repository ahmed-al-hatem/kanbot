import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const HEX_COLOR = '^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$';

export default defineConfig([
  // api.ts is a verbatim copy of the server contract; icons.ts is generated.
  globalIgnores(['dist', 'coverage', 'src/types/api.ts', 'src/components/Icon/icons.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // NFR-7: never log the token — no console in app code.
      'no-console': 'error',
      // CLAUDE.md: colors come from tokens.css only.
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${HEX_COLOR}/]`,
          message: 'Use a CSS variable from styles/tokens.css instead of a hex color.',
        },
        {
          selector: `TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]`,
          message: 'Use a CSS variable from styles/tokens.css instead of a hex color.',
        },
      ],
      // CLAUDE.md: no fetch outside src/api/.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use the API layer in src/api/ (request<T>()).' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/api/**/*.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-globals': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.node },
  },
]);
