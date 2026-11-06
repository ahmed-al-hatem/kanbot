import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const HEX_COLOR = '^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$';

/*
 * RTL & Arabic (plan §11): areas whose user-visible text already comes from src/i18n/messages.
 * In them `react/jsx-no-literals` is an error for JSX text *and* attributes (aria-label, title,
 * placeholder…). The list grows with each PR (R2 auth + shell + projects, R3 backlog + todo +
 * sprints, R4 board + history + AI + 404 + errors); R5 applies the rule to all of src/.
 */
const I18N_MIGRATED = [
  'src/i18n/**/*.{ts,tsx}',
  // R2: auth, the shell, projects, and the shared pieces they render.
  'src/features/auth/**/*.{ts,tsx}',
  'src/features/shell/**/*.{ts,tsx}',
  'src/features/projects/**/*.{ts,tsx}',
  'src/components/**/*.{ts,tsx}',
  'src/app/**/*.{ts,tsx}',
  // R3: the backlog, Todo details, the sprint form / start dialogs and the shared DnD hooks.
  'src/features/backlog/**/*.{ts,tsx}',
  'src/features/todos/**/*.{ts,tsx}',
  'src/features/sprints/SprintFormDialog.tsx',
  'src/features/sprints/StartSprintDialog.tsx',
  'src/features/sprints/sprintForm.ts',
  'src/lib/dnd/**/*.{ts,tsx}',
];

/**
 * Attribute values (and the odd glyph) that are tokens, not text: the rule checks every string
 * attribute, so these are allowed by value. Never add words a user reads or hears here.
 */
const NON_TEXT_LITERALS = [
  // HTML types, roles, ARIA states and live-region politeness.
  ...['button', 'submit', 'text', 'email', 'password', 'search', 'date', 'checkbox'],
  ...['group', 'img', 'alert', 'alertdialog', 'dialog', 'status', 'progressbar', 'true', 'false'],
  ...['polite', 'assertive'],
  // autocomplete / autocapitalize tokens.
  ...['name', 'current-password', 'new-password', 'off', 'characters'],
  // Component variants, sizes, tones, layouts and alignments.
  ...['primary', 'subtle', 'danger', 'warning', 'ai', 'dashed', 'inline', 'sm', 'lg'],
  ...['gray', 'blue', 'xlarge', 'start', 'project', 'complete', 'todo'],
  // Icon names (components/Icon/icons.ts).
  ...['globe', 'add', 'ai-sparkle', 'arrow-left', 'arrow-right', 'calendar', 'check-mark'],
  ...['chevron-down', 'cross', 'delete', 'lightbulb', 'lock-locked', 'log-out', 'menu'],
  ...['pencil', 'refresh', 'show-more-horizontal', 'spaces', 'status-error', 'theme'],
  ...['warning-outline', 'drag-handle-vertical', 'backlog', 'board', 'sprint', 'bug'],
  // Global class names, ids, test ids, routes and shortcut targets.
  ...['visually-hidden', 'kb-page', 'kb-pop', 'page-body', 'meta', 'main', 'project-search'],
  ...['live-polite', 'live-assertive', '#main', '/login', '/projects', 'create'],
  ...['backlog-search', 'backlog-priority', 'backlog-type'],
  // react-hook-form field names (Controller `name`), and the empty value of an "All …" option.
  ...['sprintId', 'labels', ''],
  // SVG: the 16px icon grid and paint keywords.
  ...['0 0 16 16', 'currentColor', 'none', 'evenodd'],
  // The shortcut key shown in the profile menu.
  '?',
];

export default defineConfig([
  // api.ts is a verbatim copy of the server contract; icons.ts is generated.
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', 'src/types/api.ts','src/components/Icon/icons.ts']),
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
    files: I18N_MIGRATED,
    ignores: ['**/*.test.{ts,tsx}'],
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
