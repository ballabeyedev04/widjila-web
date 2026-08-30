import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Backend visé par le proxy de développement — voir le commentaire ci-dessous. */
const cibleApi = `http://127.0.0.1:${process.env.VITE_DEV_API_PORT || 3000}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: '127.0.0.1',
    // Proxy de développement : l'admin appelle /api sur le même hôte → aucune
    // configuration CORS côté backend nécessaire en dev. En production, le
    // front est servi par nginx et VITE_API_BASE_URL pointe sur l'API réelle.
    //
    // Le port est repris de `backend/.env` (PORT), dont la valeur par défaut
    // est 3000 — voir `backend/src/server.js`. Il pointait sur 3109, où rien
    // n'écoute : en développement, TOUS les appels API échouaient. Le symptôme
    // (écrans vides, erreurs réseau) ne désignait pas la cause, et la
    // production n'était pas concernée puisqu'elle passe par
    // `VITE_API_BASE_URL` — de quoi laisser le décalage s'installer.
    //
    // `VITE_DEV_API_PORT` permet de suivre un backend démarré sur un autre
    // port sans modifier ce fichier.
    proxy: {
      '/api': {
        target: cibleApi,
        changeOrigin: true,
      },
      '/uploads': {
        target: cibleApi,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
