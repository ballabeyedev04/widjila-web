import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/** Module Inspections : inspections/OPR, checklist, modèles, convocations, photos. */

export const listerInspections = async (chantierId, { page = 1, limit = 20, search = '', type = '', statut = '' } = {}) => {
  const response = await api.get(`/chantiers/${chantierId}/inspections`, {
    params: { page, limit, search: search?.trim() || undefined, type: type || undefined, statut: statut || undefined },
  });
  return normalizeList(unwrap(response), 'inspections');
};

export const getInspection = async (id) => {
  const response = await api.get(`/inspections/${id}`);
  return unwrap(response)?.inspection;
};

export const creerInspection = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/inspections`, body);
  return unwrap(response)?.inspection;
};

export const modifierInspection = async (id, body) => {
  const response = await api.put(`/inspections/${id}`, body);
  return unwrap(response)?.inspection;
};

export const supprimerInspection = async (id) => {
  const response = await api.delete(`/inspections/${id}`);
  return unwrap(response);
};

export const cocherChecklist = async (inspectionId, checklistId, { coche, commentaire }) => {
  const response = await api.patch(`/inspections/${inspectionId}/checklist/${checklistId}`, { coche, commentaire });
  // Le backend renvoie la ligne mise à jour sous la clé `ligne`
  // (inspection.controller.js: data: { ligne: result.ligne }), pas `checklist`.
  return unwrap(response)?.ligne;
};

export const appliquerModele = async (inspectionId, { modeleId }) => {
  const response = await api.post(`/inspections/${inspectionId}/modele`, { modeleId });
  return unwrap(response);
};

/* ---------- Photos ---------- */
export const ajouterPhotoInspection = async (inspectionId, fichier) => {
  const fd = new FormData();
  fd.append('fichier', fichier);
  const response = await api.post(`/inspections/${inspectionId}/photos`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
};

export const listerPhotosInspection = async (inspectionId) => {
  const response = await api.get(`/inspections/${inspectionId}/photos`);
  return normalizeList(unwrap(response), 'photos');
};

/* ---------- Modèles de checklist ---------- */
export const listerModeles = async () => {
  const response = await api.get('/inspections/modeles');
  return normalizeList(unwrap(response), 'modeles');
};

export const creerModele = async (body) => {
  const response = await api.post('/inspections/modeles', body);
  return unwrap(response)?.modele;
};

export const modifierModele = async (id, body) => {
  const response = await api.put(`/inspections/modeles/${id}`, body);
  return unwrap(response)?.modele;
};

export const supprimerModele = async (id) => {
  const response = await api.delete(`/inspections/modeles/${id}`);
  return unwrap(response);
};

/* ---------- Convocations ---------- */
export const listerConvocations = async (inspectionId) => {
  const response = await api.get(`/inspections/${inspectionId}/convocations`);
  return normalizeList(unwrap(response), 'convocations');
};

export const convier = async (inspectionId, { utilisateurId }) => {
  const response = await api.post(`/inspections/${inspectionId}/convocations`, { utilisateurId });
  return unwrap(response)?.convocation;
};

export const repondreConvocation = async (inspectionId, convocationId, { statut }) => {
  const response = await api.patch(`/inspections/${inspectionId}/convocations/${convocationId}`, { statut });
  return unwrap(response)?.convocation;
};

export const retirerConvocation = async (inspectionId, convocationId) => {
  const response = await api.delete(`/inspections/${inspectionId}/convocations/${convocationId}`);
  return unwrap(response);
};
