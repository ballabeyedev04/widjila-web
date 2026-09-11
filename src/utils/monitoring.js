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

  // Les promesses non gérées et les erreurs globales sont capturées par
  // l'intégration par défaut de Sentry (GlobalHandlers). L'écouteur
  // `unhandledrejection` posé ici en plus les envoyait une SECONDE fois :
  // chaque incident comptait double, et les alertes sur le volume d'erreurs
  // sonnaient à tort.
}

/**
 * Signale une erreur — toujours au minimum dans la console (comportement
 * historique d'ErrorBoundary, conservé), et à Sentry si configuré.
 * @param {unknown} error
 * @param {Record<string, any>} [contexte]
 */
export function reporter(error, contexte = {}) {
  // Une erreur axios porte `config.headers.Authorization` : on n'en garde que
  // la méthode, le chemin, le statut, le message et l'identifiant de requête.
  // Voir securite.js.
  const propre = /** @type {Record<string, any>} */ (nettoyerErreur(error));
  const contextePropre = /** @type {Record<string, any>} */ (masquerSecrets(contexte));
  console.error('[monitoring]', propre, contextePropre);
  if (!actif) return;
  // `requestId` en ÉTIQUETTE : c'est la clé qui retrouve la requête dans les
  // journaux serveur, elle doit être filtrable dans Sentry.
  const requestId = propre?.requestId || contextePropre?.requestId;
  Sentry.captureException(propre, { extra: contextePropre, tags: requestId ? { requestId } : undefined });
}

/**
 * Faut-il signaler cet échec de requête ?
 *
 * Oui pour ce qui trahit une PANNE : réponse 5xx, aucune réponse (réseau,
 * délai dépassé). Non pour les refus métier (4xx) : un 404 ou un 422 est une
 * réponse normale de l'API, déjà affichée à l'utilisateur — les envoyer
 * noierait les vraies pannes.
 */
export function estPanneRequete(error) {
  if (!error || error.code === 'ERR_CANCELED' || error.code === 'CHEMIN_REFUSE') return false;
  const statut = error.response?.status;
  if (statut === undefined) return Boolean(error.isAxiosError || error.config);
  return statut >= 500;
}

/** Signale un échec de requête s'il trahit une panne (voir `estPanneRequete`). */
export function reporterErreurRequete(error) {
  if (!estPanneRequete(error)) return;
  reporter(error, { source: 'api' });
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
