import api from '../api.js';
import { unwrap } from '../helpers.js';

/**
 * Récupère la liste des plans disponibles.
 * Accessible sans authentification (public).
 */
export const getPlans = async () => {
  const response = await api.get('/abonnement/plans');
  return unwrap(response);
};

/**
 * Récupère le statut d'abonnement de l'organisation connectée.
 * Nécessite authentification.
 */
export const getStatus = async () => {
  const response = await api.get('/abonnement/status');
  return unwrap(response);
};

/**
 * Récupère les détails complets du plan actuel et tous les plans.
 * Nécessite authentification.
 */
export const getPlanDetails = async () => {
  const response = await api.get('/abonnement/plan-details');
  return unwrap(response);
};

/**
 * Droits et usage courants de l'organisation connectée.
 *
 * Renvoie `{ droits, usage: { utilisateurs, chantiers } }` — la formule en
 * cours, ses limites, et ce qui en est réellement consommé. C'est cette route,
 * et non `status`, qui explique un refus de créer un chantier : « 5 sur 5 »
 * répond à la question que pose un 403, là où « abonnement actif » ne dit rien.
 *
 * Ouverte à TOUS les rôles côté serveur (`subscription.route.js`), à la
 * différence de l'historique : chacun a un intérêt légitime à savoir ce qu'il
 * reste de quota avant de commencer une saisie.
 */
export const getDroits = async () => {
  const response = await api.get('/abonnement/droits');
  return unwrap(response);
};

/**
 * Historique des souscriptions — ce que l'organisation a réellement réglé.
 *
 * Réservé au groupe FACTURATION côté serveur (`requireRole(...FACTURATION)`) :
 * l'appeler pour un autre rôle produit un 403. Les écrans ne l'appellent donc
 * que lorsque le rôle connecté en fait partie.
 */
export const getHistorique = async () => {
  const response = await api.get('/abonnement/historique');
  return unwrap(response)?.souscriptions || [];
};

/**
 * Crée une PaymentIntent Stripe pour le plan choisi.
 * Nécessite authentification.
 * @param {string} planId - ID du plan (starter, pro, business)
 */
export const creerPaymentIntent = async (planId) => {
  const response = await api.post('/abonnement/payment-intent', { planId });
  return unwrap(response);
};

/**
 * Crée une PaymentIntent pour changer de plan (abonnement existant).
 * Nécessite authentification.
 * @param {string} planId - ID du nouveau plan
 */
/**
 * Session Stripe CHECKOUT — la page de paiement hébergée par Stripe.
 *
 * Répond `{ url, sessionId }` : l'adresse vers laquelle rediriger le
 * navigateur, et la référence que la page de retour interrogera. Aucune
 * donnée de carte ne passe par nos pages : c'est Stripe qui la collecte.
 */
export const creerCheckoutSession = async (planId) => {
  const response = await api.post('/abonnement/checkout-session', { planId });
  return unwrap(response);
};

/**
 * État d'un paiement, tel que le SERVEUR le connaît (alimenté par le webhook).
 *
 * `{ paiement: { statut: 'en_attente' | 'active' | 'echec' | 'annulee' | 'expiree', … } | null, droits }`.
 * Revenir de Stripe sur la page de succès ne prouve rien : c'est cette
 * réponse, et elle seule, qui autorise à annoncer un paiement.
 */
export const getEtatPaiement = async (reference) => {
  const response = await api.get('/abonnement/paiement/etat', {
    params: reference ? { reference } : undefined,
  });
  return unwrap(response);
};

export const changerPlan = async (planId) => {
  const response = await api.post('/abonnement/change-plan', { planId });
  return unwrap(response);
};

/**
 * Annule l'abonnement actuel.
 * Nécessite authentification.
 */
export const annulerAbonnement = async () => {
  const response = await api.post('/abonnement/cancel');
  return unwrap(response);
};