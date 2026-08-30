import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/**
 * Catalogue des formules — administration (« Prix abonnements »).
 *
 * Réservé au super-admin plateforme : ces routes vivent sous `/admin/`, le
 * backend refuse tout autre rôle. Le catalogue PUBLIC, lui, est servi par
 * `subscriptionService.getPlans()` et ne renvoie que les formules actives.
 */

export const listerPlansAbonnement = async () => {
  const response = await api.get('/admin/plans-abonnement');
  const data = unwrap(response);
  return {
    plans: data?.plans || [],
    // Catalogue des fonctionnalités reconnues, servi par le backend : le
    // recopier ici finirait par diverger de la liste réellement appliquée.
    fonctionnalites: data?.fonctionnalites || {},
  };
};

export const getPlanAbonnement = async (id) => {
  const response = await api.get(`/admin/plans-abonnement/${id}`);
  return unwrap(response)?.plan;
};

export const creerPlanAbonnement = async (body) => {
  const response = await api.post('/admin/plans-abonnement', body);
  return unwrap(response)?.plan;
};

export const modifierPlanAbonnement = async (id, body) => {
  const response = await api.put(`/admin/plans-abonnement/${id}`, body);
  return unwrap(response)?.plan;
};

/** Retire une formule de l'offre sans toucher aux abonnés en cours. */
export const basculerActifPlanAbonnement = async (id, actif) => {
  const response = await api.patch(`/admin/plans-abonnement/${id}/actif`, { actif });
  return unwrap(response)?.plan;
};

/**
 * Suppression — REFUSÉE par le serveur dès qu'une souscription y renvoie.
 * Le message renvoyé porte le décompte et invite à désactiver : il doit être
 * affiché tel quel.
 */
export const supprimerPlanAbonnement = async (id) => {
  const response = await api.delete(`/admin/plans-abonnement/${id}`);
  return unwrap(response);
};

/* ---------- Suivi des abonnements clients ---------- */

export const listerSouscriptions = async ({ page = 1, limit = 20, organisationId = '', statut = '' } = {}) => {
  const response = await api.get('/admin/abonnements', {
    params: {
      page,
      limit,
      organisationId: organisationId || undefined,
      statut: statut || undefined,
    },
  });
  return normalizeList(unwrap(response), 'souscriptions');
};

/**
 * Activation manuelle — le cas « Entreprise, sur devis ».
 * Contourne le paiement en ligne : tracée côté serveur (auteur, note).
 */
export const activerAbonnementManuellement = async (body) => {
  const response = await api.post('/admin/abonnements/activer', body);
  return unwrap(response);
};
