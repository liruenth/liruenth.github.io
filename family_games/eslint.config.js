import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  /* Node, not the browser: the one-off scripts at the root and the handler in
     src/api, which is deployed to Lambda rather than bundled into the app. Left
     out, `process` and `Buffer` read as undefined globals. */
  {
    files: ['*.js', 'src/api/lambda.js'],
    languageOptions: { globals: globals.node },
  },
])
