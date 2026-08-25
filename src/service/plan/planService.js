import api from '../api.js';
import { unwrap, normalizeList, toFormData } from '../helpers.js';

/** Module Plans : upload, versions, annotations. */

export const uploaderPlan = async (chantierId, { fichier, nom, format, zoneId }) => {
  const fd = toFormData({ fichier, nom, format, zoneId });
  const response = await api.post(`/chantiers/${chantierId}/plans`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response)?.plan;
};

export const listerPlans = async (chantierId) => {
  const response = await api.get(`/chantiers/${chantierId}/plans`);
  return normalizeList(unwrap(response), 'plans');
};

/**
 * Plans de TOUS les chantiers de l'organisation.
 *
 * Le serveur ne renvoie que la DERNIÈRE version de chaque plan (dédoublonnage
 * sur `chantierId + nom`, voir plan.service.js#listTousPlans) : une vue
 * transversale qui listerait toutes les révisions serait illisible.
 *
 * Non paginé côté serveur — d'où l'absence de `page`/`limit` ici.
 */
export const listerTousPlans = async ({ chantierId = '' } = {}) => {
  const response = await api.get('/plans', {
    params: { chantierId: chantierId || undefined },
  });
  return normalizeList(unwrap(response), 'plans');
};

export const getPlan = async (id) => {
  const response = await api.get(`/plans/${id}`);
  return unwrap(response)?.plan;
};

export const supprimerPlan = async (id) => {
  const response = await api.delete(`/plans/${id}`);
  return unwrap(response);
};

/* ---------- Versions ---------- */
export const listerVersions = async (planId) => {
  const response = await api.get(`/plans/${planId}/versions`);
  return normalizeList(unwrap(response), 'versions');
};

/* ---------- Annotations ---------- */
export const listerAnnotations = async (planId) => {
  const response = await api.get(`/plans/${planId}/annotations`);
  return normalizeList(unwrap(response), 'annotations');
};

export const creerAnnotation = async (planId, body) => {
  const response = await api.post(`/plans/${planId}/annotations`, body);
  return unwrap(response)?.annotation;
};

export const modifierAnnotation = async (annotationId, body) => {
  const response = await api.put(`/annotations/${annotationId}`, body);
  return unwrap(response)?.annotation;
};

export const supprimerAnnotation = async (annotationId) => {
  const response = await api.delete(`/annotations/${annotationId}`);
  return unwrap(response);
};

/**
 * Récupère un fichier du stockage protégé (/uploads/...) sous forme de blob,
 * avec le Bearer token (nécessaire — les fichiers exigent une authentification).
 */
export const fetchFichierBlob = async (url) => {
  const response = await api.get(url, { responseType: 'blob' });
  return response.data; // Blob
};
