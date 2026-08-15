import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Le template officiel Vite React ignore les identifiants capitalisés (composants) :
      // no-unused-vars ne compte pas l'usage JSX (comportement connu d'ESLint 9).
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Nouvelle règle v7 (pas dans la v5 recommandée) : signale le pattern standard
      // « chargement au montage » (setLoading + fetch) utilisé partout ici — désactivée.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
