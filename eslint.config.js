import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'functions/**', 'src/components/**', 'src/assets/**'] },
  {
    files: ['src/App.jsx', 'src/main.jsx', 'server/**/*.js', 'scripts/**/*.mjs', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { 'no-undef': 'error' },
  },
]
