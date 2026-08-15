import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: '127.0.0.1',
    // Proxy de développement : l'admin appelle /api sur le même hôte → aucune
    // configuration CORS côté backend nécessaire en dev. En production, le
    // front est servi par nginx et VITE_API_BASE_URL pointe sur l'API réelle.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3109',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3109',
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
