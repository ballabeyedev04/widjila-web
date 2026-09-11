import * as Sentry from '@sentry/react';

import { masquerSecrets, nettoyerErreur } from '../service/securite.js';

/**
 * Monitoring d'erreurs client (audit — Admin §4).
 *
 * Avant ce fichier : `ErrorBoundary` attrapait bien les plantages de rendu,
 * mais se contentait d'un `console.error` local — personne dans l'équipe
 * n'était notifié qu'un écran s'était cassé pour un client. On l'apprenait
 * par un appel de support, pas avant.
 *
 * Même principe que Redis côté backend (config/redis.js) : câblé et prêt,
 * mais INERTE tant que `VITE_SENTRY_DSN` n'est pas défini. Sans DSN,
 * `init()` ne fait rien et `reporter()` se contente du `console.error`
 * existant — aucun changement de comportement par défaut. Dès qu'un DSN
 * Sentry (gratuit jusqu'à un certain volume : sentry.io) est renseigné dans
 * `.env`, la remontée s'active sans autre changement de code.
 */

const dsn = import.meta.env.VITE_SENTRY_DSN;
let actif = false;

/** À appeler une seule fois, le plus tôt possible (main.jsx). */
export function initMonitoring() {
  if (!dsn) return; // pas de DSN → aucune tentative de connexion sortante

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Échantillonnage des traces de performance — 10% suffit à repérer les
    // écrans lents sans alourdir le volume envoyé.
    tracesSampleRate: 0.1,
    // Aucune donnée personnelle collectée d'office (adresse IP, cookies).
    sendDefaultPii: false,
    // Dernière barrière avant l'envoi : une erreur de requête transporte sa
    // configuration, donc `Authorization: Bearer …`. Le fil d'Ariane capture
    // aussi les appels à la console. Sans ce filtre, la session d'un
    // utilisateur partait en clair dans l'outil de monitoring.
    beforeSend: (evenement) => masquerSecrets(evenement),
    beforeBreadcrumb: (miette) => masquerSecrets(miette),
  });
  actif = true;

  // Erreurs hors du rendu React (gestionnaires d'événements, promesses non
  // gérées) : ErrorBoundary ne les voit jamais, mais elles cassent tout
  // autant l'expérience d'un utilisateur sur le terrain.
  window.addEventListener('unhandledrejection', (event) => {
    reporter(event.reason, { source: 'unhandledrejection' });
  });
}

/**
 * Signale une erreur — toujours au minimum dans la console (comportement
 * historique d'ErrorBoundary, conservé), et à Sentry si configuré.
 */
export function reporter(error, contexte = {}) {
  // Une erreur axios porte `config.headers.Authorization` : on n'en garde que
  // la méthode, le chemin, le statut et le message. Voir securite.js.
  const propre = nettoyerErreur(error);
  const contextePropre = masquerSecrets(contexte);
  console.error('[monitoring]', propre, contextePropre);
  if (!actif) return;
  Sentry.captureException(propre, { extra: contextePropre });
}

/** Associe les erreurs suivantes à l'utilisateur connecté (aide au diagnostic, pas de PII superflue). */
export function identifierUtilisateur(utilisateur) {
  if (!actif || !utilisateur) return;
  Sentry.setUser({ id: utilisateur.id, role: utilisateur.role, organisationId: utilisateur.organisationId });
}

export function effacerUtilisateur() {
  if (!actif) return;
  Sentry.setUser(null);
}
