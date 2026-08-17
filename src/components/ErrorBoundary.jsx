import { Component } from 'react';

import i18n from '../i18n/index.js';
import { reporter } from '../utils/monitoring.js';

/**
 * Filet de sécurité global : affiche un message propre au lieu d'une page
 * blanche si un composant plante pendant le rendu.
 *
 * Composant classe : pas de hook `useTranslation`, on interroge directement
 * l'instance i18next au moment du rendu de l'écran d'erreur.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || i18n.t('layout:erreur.inattendue') };
  }

  componentDidCatch(error, info) {
    // Correctif (audit — Admin §4) : `console.error` seul ne notifie
    // personne — voir utils/monitoring.js (inerte sans VITE_SENTRY_DSN).
    reporter(error, { source: 'ErrorBoundary', componentStack: info?.componentStack });
  }

  handleReload = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f3f5f8', fontFamily: "Inter, sans-serif", padding: 24,
        }}>
          <div style={{
            background: '#fff', border: '1px solid #e4e9ef', borderRadius: 16,
            padding: 40, textAlign: 'center', maxWidth: 460, boxShadow: '0 12px 28px rgba(15,23,42,.14)',
          }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <h2 style={{ margin: '12px 0 8px', fontSize: 20, color: '#0f172a' }}>{i18n.t('layout:erreur.titre')}</h2>
            <p style={{ color: '#52606e', fontSize: 14, marginBottom: 8 }}>{this.state.message}</p>
            <button
              onClick={this.handleReload}
              style={{
                marginTop: 12, padding: '10px 22px', borderRadius: 10, border: 'none',
                background: '#f2600c', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}
            >
              {i18n.t('layout:erreur.reessayer')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
