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