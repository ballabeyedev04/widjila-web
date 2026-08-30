import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Configuration de test — séparée de `vite.config.js` pour que la
 * construction de production n'embarque rien du harnais de test.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // `jsdom` : `renderHook` monte réellement le composant, il lui faut un DOM.
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    globals: false,
    // Nettoyage du DOM entre les tests — voir vitest.setup.js pour la raison
    // (il n'est PAS automatique avec `globals: false`).
    setupFiles: ['./vitest.setup.js'],
  },
});
