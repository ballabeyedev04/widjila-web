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
      // `varsIgnorePattern` ne couvre QUE les variables. Un composant reçu en
      // paramètre — `({ icon: Icon }) => <Icon />`, motif utilisé dans les
      // formulaires et la navigation des plans — relève d'`argsIgnorePattern`,
      // et était donc signalé alors qu'il est bel et bien rendu : ESLint ne
      // compte pas l'usage JSX pour un paramètre renommé.
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
      }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Nouvelle règle v7 (pas dans la v5 recommandée) : signale le pattern standard
      // « chargement au montage » (setLoading + fetch) utilisé partout ici — désactivée.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Outillage exécuté par Node, pas par le navigateur : `process`, `console`
    // et consorts y sont légitimes. Sans cette entrée, le bloc ci-dessus leur
    // applique les seuls globaux du navigateur et signale `process` comme
    // indéfini.
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
