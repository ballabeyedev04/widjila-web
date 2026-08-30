import i18n from '../i18n/index.js';

/**
 * Helpers partagés de la couche API.
 *
 * Le backend répond toujours `{ success, message, data: <payload> }` sur le
 * succès et `{ success: false, message, details? }` sur l'erreur.
 */

/** Déballe `data` de l'enveloppe backend (repli sur le corps brut). */
/**
 * Plafond de page accepté par le backend (`LIMITE_MAX` de
 * `pagination.middleware.js`).
 *
 * Les listes ci-dessous partaient SANS `limit` : le middleware appliquait
 * alors son défaut de 20, et l'écran paginait ces 20 éléments comme s'ils
 * étaient le total. Au-delà, les enregistrements disparaissaient de
 * l'interface sans le moindre signe.
 *
 * Le `total` renvoyé par le serveur est conservé par `normalizeList` : les
 * écrans le comparent au nombre d'éléments reçus pour avertir quand il reste
 * des données hors de vue.
 */
export const LIMITE_MAX_PAGE = 100;

export const unwrap = (response) => {
  const body = response?.data;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data;
  }
  return body;
};

/**
 * Extrait un message d'erreur lisible depuis une exception axios.
 *
 * Priorité au message du BACKEND (`data.message`, déjà rédigé côté serveur) —
 * les replis ci-dessous (traduits, respectent la langue active) ne servent
 * que quand le backend n'a physiquement pas pu répondre avec un message :
 * panne réseau, timeout, ou proxy qui coupe la requête avant Express (nginx).
 * `i18n.t()` (pas useTranslation) : ce module n'est pas un composant React,
 * mais retourne bien la traduction de la langue active à l'instant de l'appel.
 */
export const getErrorMessage = (error, fallback = i18n.t('common:messages.erreurGenerique')) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data) return data;
  if (data?.message) return data.message;
  if (error?.response?.status === 401) return i18n.t('common:messages.sessionExpiree');
  if (error?.response?.status === 403) return i18n.t('common:messages.accesRefuse');
  if (error?.response?.status === 404) return i18n.t('common:messages.ressourceIntrouvable');
  if (error?.response?.status === 429) return i18n.t('common:messages.tropDeRequetes');
  if (!error?.response && error?.request) return i18n.t('common:messages.erreurReseau');
  if (error?.message?.includes('timeout')) return i18n.t('common:messages.delaiDepasse');
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
 *
 * Le backend renvoie le total sous DEUX formes selon les modules :
 *   - à plat, `{ membres, total }` — la forme historique ;
 *   - imbriquée, `{ corpsEtat, pagination: { total, page, limit } }` — les
 *     référentiels et le catalogue des formules.
 *
 * La seconde n'était pas lue : le total retombait sur `items.length`, donc sur
 * la TAILLE DE PAGE. La pagination affichait alors une seule page et les
 * suivantes étaient inatteignables — invisible tant que le catalogue tenait
 * sur une page.
 *
 * L'ordre de préférence va du plus précis au plus approximatif ; `?? 0` n'est
 * pas utilisé pour `total` car un total de 0 légitime doit rester 0.
 */
const lireTotal = (payload, items) => {
  if (typeof payload.total === 'number') return payload.total;
  if (typeof payload.pagination?.total === 'number') return payload.pagination.total;
  return items.length;
};

export const normalizeList = (payload, listKey = null) => {
  if (!payload) return { items: [], total: 0 };
  if (listKey && Array.isArray(payload[listKey])) {
    return { items: payload[listKey], total: lireTotal(payload, payload[listKey]) };
  }
  const candidates = ['items', 'liste', 'membres', 'chantiers', 'utilisateurs', 'organisations',
    'filiales', 'equipes', 'plans', 'reserves', 'inspections', 'documents', 'notifications',
    'connexions', 'sessions', 'logs', 'rapports', 'partenaires', 'medias', 'pieces', 'phases', 'lots',
    'types'];
  for (const key of candidates) {
    if (Array.isArray(payload[key])) return { items: payload[key], total: lireTotal(payload, payload[key]) };
  }
  return { items: [], total: 0 };
};
