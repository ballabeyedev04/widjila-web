import { Component } from 'react';

import i18n from '../i18n/index.js';
import { reporter } from '../utils/monitoring.js';

/** Référence courte à citer au support, envoyée avec le rapport d'erreur. */
const genererReference = () => {
  const aleatoire = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return aleatoire.replace(/-/g, '').slice(0, 8).toUpperCase();
};

/**
 * Filet de sécurité : affiche un message propre au lieu d'une page blanche si
 * un composant plante pendant le rendu.
 *
 * Deux usages :
 *   - GLOBAL (App.jsx) — dernier recours, plein écran ;
 *   - PAR PAGE (AdminLayout, `compact` + `resetKey`) — une page cassée ne fait
 *     plus tomber toute l'application : le menu reste utilisable, et changer
 *     de page (`resetKey` = chemin) efface l'erreur.
 *
 * CORRECTIFS :
 *   - « Réessayer » se contentait de remettre l'état à zéro : le même
 *     composant, avec les mêmes données, replantait aussitôt. Un second bouton
 *     recharge la page (données et code frais) ;
 *   - le message technique (`Cannot read properties of undefined…`)
 *     s'affichait tel quel en production — il est remplacé par un texte
 *     générique ET une RÉFÉRENCE, envoyée avec le rapport, que l'utilisateur
 *     peut citer au support.
 *
 * Composant classe : pas de hook `useTranslation`, on interroge directement
 * l'instance i18next au moment du rendu de l'écran d'erreur.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', reference: null };
  }

  static getDerivedStateFromError(error) {
    const message = import.meta.env.PROD
      ? i18n.t('layout:erreur.inattendue')
      : (error?.message || i18n.t('layout:erreur.inattendue'));
    return { hasError: true, message, reference: error?.requestId || genererReference() };
  }

  componentDidCatch(error, info) {
    // Correctif (audit — Admin §4) : `console.error` seul ne notifie
    // personne — voir utils/monitoring.js (inerte sans VITE_SENTRY_DSN).
    reporter(error, {
      source: 'ErrorBoundary',
      reference: this.state.reference,
      chemin: typeof window !== 'undefined' ? window.location.pathname : undefined,
      componentStack: info?.componentStack,
    });
  }

  componentDidUpdate(precedentes) {
    // Changement de page : l'erreur appartenait à la page quittée.
    if (this.state.hasError && precedentes.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: '', reference: null });
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '', reference: null });
  };

  handleRechargerPage = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const compact = Boolean(this.props.compact);
    return (
      <div
        role="alert"
        style={{
          minHeight: compact ? 320 : '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: compact ? 'transparent' : '#f3f5f8', fontFamily: 'Inter, sans-serif', padding: 24,
        }}
      >
        <div style={{
          background: '#fff', border: '1px solid #e4e9ef', borderRadius: 16,
          padding: 40, textAlign: 'center', maxWidth: 460, boxShadow: '0 12px 28px rgba(15,23,42,.14)',
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ margin: '12px 0 8px', fontSize: 20, color: '#0f172a' }}>{i18n.t('layout:erreur.titre')}</h2>
          <p style={{ color: '#52606e', fontSize: 14, marginBottom: 8 }}>{this.state.message}</p>
          {this.state.reference && (
            <p style={{ color: '#8a96a3', fontSize: 12, marginBottom: 8 }}>
              {i18n.t('layout:erreur.reference', { defaultValue: 'Référence' })} : <code>{this.state.reference}</code>
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                marginTop: 12, padding: '10px 22px', borderRadius: 10, border: 'none',
                background: '#f2600c', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}
            >
              {i18n.t('layout:erreur.reessayer')}
            </button>
            <button
              onClick={this.handleRechargerPage}
              style={{
                marginTop: 12, padding: '10px 22px', borderRadius: 10, border: '1px solid #e4e9ef',
                background: '#fff', color: '#0f172a', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}
            >
              {i18n.t('layout:erreur.recharger', { defaultValue: 'Recharger la page' })}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
