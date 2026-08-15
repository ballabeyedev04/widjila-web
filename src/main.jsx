import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './assets/css/components.css';
import './assets/css/swal.custom.css';
// Initialise i18next avant le premier rendu (module 1 — gestion des langues).
import './i18n/index.js';
// Monitoring d'erreurs (audit — Admin §4) — inerte sans VITE_SENTRY_DSN,
// voir utils/monitoring.js. Initialisé avant le premier rendu pour capter
// les erreurs le plus tôt possible.
import { initMonitoring } from './utils/monitoring.js';
import App from './App.jsx';

initMonitoring();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
