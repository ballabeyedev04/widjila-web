import api from '../api.js';
import { unwrap, normalizeList, LIMITE_MAX_PAGE } from '../helpers.js';

/** Module Chantier : CRUD, structure (bâtiments/étages/zones/lots), phases, affectations. */

/**
 * @param {object} [params]
 * @param {'mes'|'a_valider'} [params.demandes]  Ouvre la liste aux chantiers
 *   EN DEMANDE, que le serveur écarte par défaut : un chantier en attente ou
 *   refusé n'est pas un chantier en activité.
 *     - 'mes'       → les demandes déposées par le compte connecté ;
 *     - 'a_valider' → la file d'attente de ceux qui tranchent.
 */
export const listerChantiers = async ({ page = 1, limit = 20, search = '', statut = '', demandes = '' } = {}) => {
  const response = await api.get('/chantiers', {
    params: {
      page,
      limit,
      search: search?.trim() || undefined,
      statut: statut || undefined,
      demandes: demandes || undefined,
    },
  });
  return normalizeList(unwrap(response), 'chantiers');
};

export const getChantier = async (id) => {
  const response = await api.get(`/chantiers/${id}`);
  return unwrap(response)?.chantier;
};

export const creerChantier = async (body) => {
  const response = await api.post('/chantiers', body);
  return unwrap(response)?.chantier;
};

export const modifierChantier = async (id, body) => {
  const response = await api.put(`/chantiers/${id}`, body);
  return unwrap(response)?.chantier;
};

export const changerStatutChantier = async (id, statut) => {
  const response = await api.patch(`/chantiers/${id}/statut`, { statut });
  return unwrap(response)?.chantier;
};

/* ---------- Validation des demandes de chantier ---------- */

/** Accepte une demande : le chantier devient réellement utilisable. */
export const validerChantier = async (id) => {
  const response = await api.patch(`/chantiers/${id}/valider`);
  return unwrap(response)?.chantier;
};

/**
 * Refuse une demande. Le motif est OBLIGATOIRE côté serveur (10 caractères au
 * minimum) : c'est la seule indication dont dispose le demandeur pour
 * corriger, et il part tel quel dans le courriel.
 */
export const rejeterChantier = async (id, motif) => {
  const response = await api.patch(`/chantiers/${id}/rejeter`, { motif });
  return unwrap(response)?.chantier;
};

export const supprimerChantier = async (id) => {
  const response = await api.delete(`/chantiers/${id}`);
  return unwrap(response);
};

export const dupliquerChantier = async (id, { nom } = {}) => {
  const response = await api.post(`/chantiers/${id}/dupliquer`, { nom });
  return unwrap(response)?.chantier;
};

/* ---------- Phases ---------- */
export const listerPhases = async (chantierId) => {
  const response = await api.get(`/chantiers/${chantierId}/phases`);
  return normalizeList(unwrap(response), 'phases');
};

export const creerPhase = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/phases`, body);
  return unwrap(response)?.phase;
};

export const modifierPhase = async (chantierId, phaseId, body) => {
  const response = await api.put(`/chantiers/${chantierId}/phases/${phaseId}`, body);
  return unwrap(response)?.phase;
};

export const supprimerPhase = async (chantierId, phaseId) => {
  const response = await api.delete(`/chantiers/${chantierId}/phases/${phaseId}`);
  return unwrap(response);
};

export const getCalendrier = async (chantierId) => {
  const response = await api.get(`/chantiers/${chantierId}/calendrier`);
  return unwrap(response);
};

/* ---------- Structure ---------- */
export const creerBatiment = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/batiments`, body);
  return unwrap(response)?.batiment;
};

export const creerEtage = async (chantierId, batimentId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/batiments/${batimentId}/etages`, body);
  return unwrap(response)?.etage;
};

export const creerZone = async (chantierId, batimentId, etageId, body) => {
  const response = await api.post(
    `/chantiers/${chantierId}/batiments/${batimentId}/etages/${etageId}/zones`,
    body
  );
  return unwrap(response)?.zone;
};

/* ---------- Structure : modification & suppression ---------- */
/**
 * La SUPPRESSION est refusée par le serveur tant qu'une réserve est rattachée
 * à l'élément ou à l'un de ses descendants — le message renvoyé porte le
 * nombre exact. Il doit donc être affiché tel quel à l'utilisateur, et non
 * remplacé par un « suppression impossible » générique.
 */
export const modifierBatiment = async (chantierId, batimentId, body) => {
  const response = await api.put(`/chantiers/${chantierId}/batiments/${batimentId}`, body);
  return unwrap(response)?.batiment;
};

export const supprimerBatiment = async (chantierId, batimentId) => {
  const response = await api.delete(`/chantiers/${chantierId}/batiments/${batimentId}`);
  return unwrap(response);
};

export const modifierEtage = async (chantierId, batimentId, etageId, body) => {
  const response = await api.put(
    `/chantiers/${chantierId}/batiments/${batimentId}/etages/${etageId}`,
    body
  );
  return unwrap(response)?.etage;
};

export const supprimerEtage = async (chantierId, batimentId, etageId) => {
  const response = await api.delete(
    `/chantiers/${chantierId}/batiments/${batimentId}/etages/${etageId}`
  );
  return unwrap(response);
};

export const modifierZone = async (chantierId, batimentId, etageId, zoneId, body) => {
  const response = await api.put(
    `/chantiers/${chantierId}/batiments/${batimentId}/etages/${etageId}/zones/${zoneId}`,
    body
  );
  return unwrap(response)?.zone;
};

export const supprimerZone = async (chantierId, batimentId, etageId, zoneId) => {
  const response = await api.delete(
    `/chantiers/${chantierId}/batiments/${batimentId}/etages/${etageId}/zones/${zoneId}`
  );
  return unwrap(response);
};

export const creerLot = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/lots`, body);
  return unwrap(response)?.lot;
};

export const listerLots = async (chantierId, { limit = LIMITE_MAX_PAGE } = {}) => {
  const response = await api.get(`/chantiers/${chantierId}/lots`, { params: { limit } });
  return normalizeList(unwrap(response), 'lots');
};

/* ---------- Affectations membres ---------- */
export const listerMembresChantier = async (chantierId, { limit = LIMITE_MAX_PAGE } = {}) => {
  const response = await api.get(`/chantiers/${chantierId}/membres`, { params: { limit } });
  return normalizeList(unwrap(response), 'membres');
};

export const assignerMembres = async (chantierId, { membreIds, roleChantier }) => {
  const response = await api.post(`/chantiers/${chantierId}/membres`, { membreIds, roleChantier });
  return unwrap(response);
};

export const retirerMembreChantier = async (chantierId, membreId) => {
  const response = await api.delete(`/chantiers/${chantierId}/membres/${membreId}`);
  return unwrap(response);
};
