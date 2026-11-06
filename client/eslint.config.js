import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const HEX_COLOR = '^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$';

/**
 * Attribute values (and the odd glyph) that are tokens, not text: the rule checks every string
 * attribute, so these are allowed by value. Never add words a user reads or hears here.
 */
const NON_TEXT_LITERALS = [
  // HTML types, roles, ARIA states and live-region politeness.
  ...['button', 'submit', 'text', 'email', 'password', 'search', 'date', 'checkbox'],
  ...['group', 'img', 'alert', 'alertdialog', 'dialog', 'status', 'progressbar', 'true', 'false'],
  ...['polite', 'assertive', 'log', 'radio', 'number', 'numeric'],
  // Link targets and rel tokens (AI Markdown links leave in a new tab without access to the app).
  ...['_blank', 'noopener noreferrer'],
  // autocomplete / autocapitalize tokens.
  ...['name', 'current-password', 'new-password', 'off', 'characters'],
  // Text direction (dir="ltr" on Latin-only inputs, dir="auto" on user and AI text).
  ...['ltr', 'auto'],
  // Component variants, sizes, tones, layouts and alignments.
  ...['primary', 'subtle', 'danger', 'warning', 'ai', 'dashed', 'inline', 'sm', 'lg'],
  ...['gray', 'blue', 'xlarge', 'start', 'project', 'complete', 'todo'],
  ...['success', 'large', 'full', 'generate', 'plan', 'route'],
  // Icon names (components/Icon/icons.ts).
  ...['globe', 'add', 'ai-sparkle', 'arrow-left', 'arrow-right', 'calendar', 'check-mark'],
  ...['chevron-down', 'cross', 'delete', 'lightbulb', 'lock-locked', 'log-out', 'menu'],
  ...['pencil', 'refresh', 'show-more-horizontal', 'spaces', 'status-error', 'theme'],
  ...['warning-outline', 'drag-handle-vertical', 'backlog', 'board', 'sprint', 'bug'],
  ...['send', 'status-warning', 'check-circle'],
  // Global class names, ids, test ids, routes and shortcut targets.
  ...['visually-hidden', 'kb-page', 'kb-pop', 'page-body', 'meta', 'main', 'project-search'],
  ...['live-polite', 'live-assertive', '#main', '/login', '/projects', 'create'],
  ...['backlog-search', 'backlog-priority', 'backlog-type'],
  ...['sprint-list-title', 'sprint-detail-title', 'kb-rise kb-stagger'],
  // Form field names (react-hook-form `name`, radio groups), and the empty value of an "All …" option.
  ...['sprintId', 'labels', 'move-unfinished', ''],
  // SVG: the 16px icon grid, paint and text-anchor keywords.
  ...['0 0 16 16', 'currentColor', 'none', 'evenodd', 'middle'],
  // The shortcut key shown in the profile menu.
  '?',
];

export default defineConfig([
  // api.ts is a verbatim copy of the server contract; icons.ts is generated.
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'src/types/api.ts',
    'src/components/Icon/icons.ts',
  ]),
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
    /*
     * RTL & Arabic (plan §11): every user-visible string comes from src/i18n/messages, so
     * `react/jsx-no-literals` is an error for JSX text *and* attributes (aria-label, title,
     * placeholder…) in all of src/ (global since R5). Left out, on purpose:
     * - tests and src/test/**: fixtures and queries are written in the language under test;
     * - src/dev/**: the `/__ui` component catalogue, a dev-only page (not routed in production)
     *   whose specimen labels ("Primary", "Sara Ahmed") are samples, not UI text.
     */
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', 'src/test/**', 'src/dev/**'],
    plugins: { react },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          noAttributeStrings: true,
          ignoreProps: false,
          allowedStrings: NON_TEXT_LITERALS,
        },
      ],
    },
  },
  {
    files: ['src/api/**/*.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    rules: {
      'no-restricted-globals': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Playwright runs specs in Node; `page.evaluate` callbacks run in the browser.
    files: ['e2e/**'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
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
