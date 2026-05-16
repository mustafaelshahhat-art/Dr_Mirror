import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import i18next from 'eslint-plugin-i18next'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { i18next },
    rules: {
      // Warn on hardcoded string literals inside JSX elements.
      // Error-level would block build; warn-level surfaces issues without breaking CI.
      'i18next/no-literal-string': [
        'warn',
        {
          mode: 'jsx-only',
          words: {
            exclude: [
              '[0-9!-/:-@[-`{-~]+',
              '[A-Z_-]+',
              '·', '—', ' ', '•',
            ],
          },
          'jsx-attributes': {
            exclude: [
              'className', 'style', 'styleName', 'href', 'to', 'path', 'type', 'dir', 'role',
              'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
              'aria-controls', 'aria-expanded',
              'data-testid', 'htmlFor', 'name', 'id', 'autoComplete', 'inputMode',
              'variant', 'size', 'tone', 'as', 'key', 'target', 'rel',
              'rows', 'maxLength', 'placeholder', 'defaultValue',
            ],
          },
        },
      ],
    },
  },
])
