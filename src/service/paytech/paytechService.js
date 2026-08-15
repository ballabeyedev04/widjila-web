import api from '../api.js';
import { unwrap } from '../helpers.js';

/**
 * Service pour l'intégration PayTech côté frontend.
 * Gère la création de paiement et la redirection vers PayTech.
 */

/**
 * Crée un paiement PayTech pour le plan choisi.
 * Nécessite authentification.
 * @param {string} planId - ID du plan (starter, pro, business)
 * @returns {Promise<Object>} { token, redirectUrl, refCommand }
 */
export const createPayTechPayment = async (planId) => {
  const response = await api.post('/paytech/payment', { planId });
  return unwrap(response);
};

/**
 * Vérifie le statut d'un paiement PayTech.
 * @param {string} token - Token de paiement PayTech
 * @returns {Promise<Object>} Statut du paiement
 */
export const getPayTechPaymentStatus = async (token) => {
  const response = await api.get('/paytech/payment/status', { params: { token } });
  return unwrap(response);
};

/**
 * Vérifie le paiement après retour de l'utilisateur (success_url).
 * @param {string} token - Token PayTech (optionnel)
 * @param {string} ref - Référence commande (optionnel)
 * @returns {Promise<Object>} Résultat de vérification
 */
export const verifyPayTechPayment = async (token, ref) => {
  const params = {};
  if (token) params.token = token;
  if (ref) params.ref = ref;
  const response = await api.get('/paytech/payment/verify', { params });
  return unwrap(response);
};

/**
 * Redirige l'utilisateur vers la page de paiement PayTech.
 * @param {string} redirectUrl - URL de redirection fournie par PayTech
 */
export const redirectToPayTech = (redirectUrl) => {
  // PayTech recommande d'ouvrir dans un nouvel onglet ou popup
  // Pour éviter les problèmes de CORS et de navigation
  window.open(redirectUrl, '_blank', 'noopener,noreferrer');
};

/**
 * Ouvre PayTech dans une popup dimensionnée.
 * @param {string} redirectUrl - URL de redirection PayTech
 * @returns {Window} Référence à la fenêtre popup
 */
export const openPayTechPopup = (redirectUrl) => {
  const width = 450;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  return window.open(
    redirectUrl,
    'paytech-payment',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
};

/**
 * Écoute les messages de la popup PayTech (si configuré côté PayTech).
 * @param {Function} onMessage - Callback appelé à la réception d'un message
 * @returns {Function} Fonction de nettoyage pour removeEventListener
 */
export const listenPayTechMessages = (onMessage) => {
  const handler = (event) => {
    // Vérifier l'origine pour la sécurité
    if (event.origin !== 'https://paytech.sn') return;
    if (event.data && event.data.type === 'paytech_result') {
      onMessage(event.data);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
};