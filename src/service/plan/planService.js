import api from '../api.js';
import { unwrap, normalizeList, toFormData } from '../helpers.js';
import { versBlobAffichable } from '../securite.js';

/** Module Plans : upload, versions, annotations. */

/**
 * Dépose un plan, RATTACHÉ à l'endroit qu'il décrit.
 *
 * Seul `zoneId` était transmis : un plan de bâtiment ou de niveau partait donc
 * sans rattachement et retombait au rang de « plan global ». La hiérarchie
 * bâtiment › niveau › appartement — celle que le mobile dépose et que le
 * parcours de consultation redescend — n'était pas constructible depuis le
 * web. Le serveur, lui, accepte les trois depuis toujours (voir
 * `backend/src/modules/plan/validation/plan.validation.js`).
 *
 * `parentId` rattache un plan de détail à son plan porteur ; `type_plan`
 * qualifie le document (« Plan de masse », « Coupe »…).
 */
export const uploaderPlan = async (
  chantierId,
  { fichier, nom, format, batimentId, etageId, zoneId, parentId, type_plan: typePlan },
) => {
  const fd = toFormData({
    fichier, nom, format, batimentId, etageId, zoneId, parentId, type_plan: typePlan,
  });
  const response = await api.post(`/chantiers/${chantierId}/plans`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response)?.plan;
};

/**
 * Remplace le FICHIER d'un plan — une nouvelle version, pas un nouveau plan.
 *
 * Ni le nom ni le rattachement ne sont renvoyés : le serveur les reprend du
 * plan désigné, faute de quoi « remplacer le fichier » permettrait de déplacer
 * un plan sous couvert d'en corriger le contenu. Les réserves déjà pointées
 * dessus suivent la nouvelle version.
 */
export const remplacerFichierPlan = async (planId, { fichier, format }) => {
  const fd = toFormData({ fichier, format });
  const response = await api.post(`/plans/${planId}/versions`, fd, {
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

/**
 * Plans de PREMIER NIVEAU d'un chantier — ceux qui n'ont pas de parent.
 *
 * Distinct de [listerPlans], qui renvoie l'arborescence À PLAT : plan global,
 * plans de bâtiment, plans d'étage et plans de détail dans la même liste. Cette
 * vue-là convient au dossier documentaire du chantier ; elle est exactement ce
 * qu'il ne faut pas au parcours de relevé, où l'on descend un cran à la fois et
 * où chaque écran ne doit montrer que les enfants DIRECTS du plan ouvert.
 *
 * C'est le SERVEUR qui borne la descente (`parentId IS NULL` ici,
 * `/plans/:id/sous-plans` ensuite), et non un filtre local sur une liste
 * complète : le client ne connaît donc à aucun moment plus d'un cran
 * d'arborescence, quelle que soit la taille du chantier.
 *
 * Chaque plan renvoyé porte `nombre_sous_plans` et `nombre_reserves`, comptés
 * côté serveur (`plan.service.js#_compterEnfants`). Sans eux, une tuile ne
 * pourrait pas dire si elle mène plus bas — il faudrait ouvrir chaque plan
 * pour l'apprendre.
 */
export const listerPlansRacines = async (chantierId) => {
  const response = await api.get(`/chantiers/${chantierId}/plans/racines`);
  return normalizeList(unwrap(response), 'plans');
};

/**
 * Sous-plans DIRECTS d'un plan — jamais leurs propres détails.
 *
 * Même forme d'objet que [listerPlansRacines], compteurs compris : le parcours
 * n'a ainsi qu'un seul rendu de tuile à écrire, que l'on soit au premier cran
 * ou au cinquième.
 */
export const listerSousPlans = async (planId) => {
  const response = await api.get(`/plans/${planId}/sous-plans`);
  return normalizeList(unwrap(response), 'sousPlans');
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

/* ---------- Zones cliquables (hotspots) ---------- */
/**
 * Repères cliquables posés sur un plan : ils font descendre le consultant du
 * plan global vers un bâtiment, d'un bâtiment vers un étage, d'un étage vers
 * un appartement. Coordonnées en POURCENTAGES de la page (0-100), jamais en
 * pixels — voir backend/src/models/planHotspot.model.js.
 */
export const listerHotspots = async (planId) => {
  const response = await api.get(`/plans/${planId}/hotspots`);
  return normalizeList(unwrap(response), 'hotspots');
};

export const creerHotspot = async (planId, body) => {
  const response = await api.post(`/plans/${planId}/hotspots`, body);
  return unwrap(response)?.hotspot;
};

export const modifierHotspot = async (hotspotId, body) => {
  const response = await api.put(`/hotspots/${hotspotId}`, body);
  return unwrap(response)?.hotspot;
};

export const supprimerHotspot = async (hotspotId) => {
  const response = await api.delete(`/hotspots/${hotspotId}`);
  return unwrap(response);
};

/**
 * Récupère un fichier du stockage protégé (/uploads/...) sous forme de blob,
 * avec la session (les fichiers exigent une authentification).
 *
 * Le blob rendu est TOUJOURS d'un type affichable — PDF, image, vidéo, son —
 * ou la fonction lève. Une URL `blob:` hérite de l'origine de l'application :
 * un HTML ou un SVG ouvert ainsi dans une `<iframe>` y exécuterait ses
 * scripts, avec accès à la session. Voir `securite.js#versBlobAffichable`.
 *
 * @param {string} url
 * @returns {Promise<Blob>}
 */
export const fetchFichierBlob = async (url) => {
  const response = await api.get(url, { responseType: 'blob' });
  return versBlobAffichable(response.data);
};

/**
 * Octets BRUTS d'un fichier protégé, sans le contrôle d'affichage de
 * `fetchFichierBlob`. Réservé au TÉLÉCHARGEMENT (`telechargerFichierProtege`),
 * jamais à un aperçu.
 *
 * @param {string} url
 * @returns {Promise<Blob>}
 */
export const fetchFichierBrut = async (url) => {
  const response = await api.get(url, { responseType: 'blob' });
  return response.data;
};

/**
 * Télécharge un fichier protégé sous le nom donné.
 *
 * Passe par les octets bruts : un document Word, un tableur ou un plan DWG
 * n'est pas « affichable », et `fetchFichierBlob` les refusait — leur
 * téléchargement échouait sur « Type de fichier non affichable ». Le blob est
 * retypé en `application/octet-stream` : avec l'attribut `download`, le
 * navigateur l'enregistre sans jamais l'interpréter dans l'origine de
 * l'application, quel que soit son contenu.
 *
 * @param {string} url
 * @param {string} nom
 */
export const telechargerFichierProtege = async (url, nom) => {
  const brut = await fetchFichierBrut(url);
  const objet = URL.createObjectURL(new Blob([brut], { type: 'application/octet-stream' }));
  const lien = window.document.createElement('a');
  lien.href = objet;
  lien.download = nom || 'fichier';
  window.document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // Le temps pour le navigateur de lancer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(objet), 30000);
};
