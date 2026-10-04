import api from '../api.js';
import { unwrap } from '../helpers.js';

/**
 * Devis d'abonnement — côté ADMINISTRATION.
 *
 * C'est ici, et nulle part ailleurs, que naissent les montants : le client
 * ne fait que décrire son besoin (`subscriptionService.js#demanderDevis`).
 * Les routes correspondantes sont gardées par le rôle super-admin ET par
 * l'authentification à deux facteurs, comme l'activation manuelle.
 */

/** Tous les devis, filtrables par statut et par organisation. */
export const listerDevisAdmin = async ({ statut, organisationId, page, limit } = {}) => {
  const response = await api.get('/admin/abonnements/devis', {
    params: {
      ...(statut ? { statut } : {}),
      ...(organisationId ? { organisationId } : {}),
      ...(page ? { page } : {}),
      ...(limit ? { limit } : {}),
    },
  });
  const data = unwrap(response);
  return { devis: data?.devis || [], total: data?.total || 0 };
};

/**
 * Chiffrage : montant HT, taux de TVA, durée, limites, options, conditions.
 *
 * La TVA et le TTC ne se transmettent PAS — le serveur les calcule à partir
 * du HT et du taux. C'est ce TTC qui sera débité : une faute de frappe dans
 * un champ saisi deux fois se paierait comptant.
 */
export const chiffrerDevis = async (id, chiffrage) => {
  const response = await api.put(`/admin/abonnements/devis/${id}`, chiffrage);
  return unwrap(response)?.devis;
};

/** Transmission au client. Séparée du chiffrage : on prépare, on relit, on envoie. */
export const envoyerDevis = async (id) => {
  const response = await api.post(`/admin/abonnements/devis/${id}/envoyer`);
  return unwrap(response)?.devis;
};
