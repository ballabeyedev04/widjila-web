/**
 * Helpers partagés de la couche API.
 *
 * Le backend répond toujours `{ success, message, data: <payload> }` sur le
 * succès et `{ success: false, message, details? }` sur l'erreur.
 */

/** Déballe `data` de l'enveloppe backend (repli sur le corps brut). */
export const unwrap = (response) => {
  const body = response?.data;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data;
  }
  return body;
};

/** Extrait un message d'erreur lisible depuis une exception axios. */
export const getErrorMessage = (error, fallback = 'Une erreur est survenue') => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data) return data;
  if (data?.message) return data.message;
  if (error?.response?.status === 401) return 'Session expirée, veuillez vous reconnecter.';
  if (error?.response?.status === 403) return 'Accès refusé.';
  if (error?.response?.status === 404) return 'Ressource introuvable.';
  if (error?.response?.status === 429) return 'Trop de requêtes. Réessayez dans 15 minutes.';
  if (!error?.response && error?.request) return 'Erreur réseau, vérifiez votre connexion.';
  if (error?.message?.includes('timeout')) return 'Le serveur met trop de temps à répondre.';
  return fallback;
};

/** Construit un FormData pour les uploads multipart (fichier + champs). */
export const toFormData = (data) => {
  const fd = new FormData();
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => fd.append(key, v));
    } else {
      fd.append(key, value);
    }
  });
  return fd;
};

/**
 * Normalise un payload de liste paginée : `{ items, total }`.
 * Le backend renvoie parfois `{ membres, total }`, `{ chantiers, total }`…
 */
export const normalizeList = (payload, listKey = null) => {
  if (!payload) return { items: [], total: 0 };
  if (listKey && Array.isArray(payload[listKey])) {
    return { items: payload[listKey], total: payload.total ?? payload[listKey].length };
  }
  const candidates = ['items', 'liste', 'membres', 'chantiers', 'utilisateurs', 'organisations',
    'filiales', 'equipes', 'plans', 'reserves', 'inspections', 'documents', 'notifications',
    'connexions', 'sessions', 'logs', 'rapports', 'partenaires', 'medias', 'pieces', 'phases', 'lots'];
  for (const key of candidates) {
    if (Array.isArray(payload[key])) return { items: payload[key], total: payload.total ?? payload[key].length };
  }
  return { items: [], total: 0 };
};
