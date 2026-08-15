import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/** Module Réserves : CRUD, statuts, série, pièces, signatures, affectations, commentaires, médias, Excel. */

export const listerReserves = async (
  chantierId,
  { page = 1, limit = 20, search = '', statut = '', severite = '', lotId = '' } = {}
) => {
  const response = await api.get(`/chantiers/${chantierId}/reserves`, {
    params: {
      page, limit,
      search: search?.trim() || undefined,
      statut: statut || undefined,
      severite: severite || undefined,
      lotId: lotId || undefined,
    },
  });
  return normalizeList(unwrap(response), 'reserves');
};

export const getReserve = async (id) => {
  const response = await api.get(`/reserves/${id}`);
  return unwrap(response)?.reserve;
};

export const creerReserve = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/reserves`, body);
  return unwrap(response)?.reserve;
};

export const creerSerieReserves = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/reserves/serie`, body);
  return unwrap(response);
};

export const modifierReserve = async (id, body) => {
  const response = await api.put(`/reserves/${id}`, body);
  return unwrap(response)?.reserve;
};

export const changerStatutReserve = async (id, { statut, motif }) => {
  const response = await api.patch(`/reserves/${id}/statut`, { statut, motif });
  return unwrap(response)?.reserve;
};

export const supprimerReserve = async (id) => {
  const response = await api.delete(`/reserves/${id}`);
  return unwrap(response);
};

export const dupliquerReserve = async (id) => {
  const response = await api.post(`/reserves/${id}/dupliquer`);
  return unwrap(response)?.reserve;
};

/* ---------- Pièces jointes ---------- */
export const ajouterPieceJointe = async (reserveId, fichier) => {
  const fd = new FormData();
  fd.append('fichier', fichier);
  const response = await api.post(`/reserves/${reserveId}/pieces`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
};

export const listerPiecesJointes = async (reserveId) => {
  const response = await api.get(`/reserves/${reserveId}/pieces`);
  return normalizeList(unwrap(response), 'pieces');
};

export const supprimerPieceJointe = async (pieceId) => {
  const response = await api.delete(`/reserves/pieces/${pieceId}`);
  return unwrap(response);
};

/* ---------- Signatures ---------- */
export const signerReserve = async (reserveId, body) => {
  const response = await api.post(`/reserves/${reserveId}/signatures`, body);
  return unwrap(response)?.signature;
};

export const listerSignatures = async (reserveId) => {
  const response = await api.get(`/reserves/${reserveId}/signatures`);
  return normalizeList(unwrap(response), 'signatures');
};

/* ---------- Affectations ---------- */
export const affecterReserve = async (reserveId, body) => {
  const response = await api.post(`/reserves/${reserveId}/affectations`, body);
  return unwrap(response)?.affectation;
};

export const listerAffectations = async (reserveId) => {
  const response = await api.get(`/reserves/${reserveId}/affectations`);
  return normalizeList(unwrap(response), 'affectations');
};

export const retirerAffectation = async (reserveId, affectationId) => {
  const response = await api.delete(`/reserves/${reserveId}/affectations/${affectationId}`);
  return unwrap(response);
};

/* ---------- QR ---------- */
export const genererQr = async (reserveId) => {
  const response = await api.get(`/reserves/${reserveId}/qr`);
  return unwrap(response); // { qr, url }
};

/* ---------- Commentaires ---------- */
export const ajouterCommentaire = async (reserveId, { message }) => {
  const response = await api.post(`/reserves/${reserveId}/commentaires`, { message });
  return unwrap(response)?.commentaire;
};

export const listerCommentaires = async (reserveId) => {
  const response = await api.get(`/reserves/${reserveId}/commentaires`);
  return normalizeList(unwrap(response), 'commentaires');
};

/* ---------- Médias ---------- */
export const ajouterMedia = async (reserveId, fichier) => {
  const fd = new FormData();
  fd.append('fichier', fichier);
  const response = await api.post(`/reserves/${reserveId}/medias`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
};

export const listerMedias = async (reserveId) => {
  const response = await api.get(`/reserves/${reserveId}/medias`);
  return normalizeList(unwrap(response), 'medias');
};

export const supprimerMedia = async (mediaId) => {
  const response = await api.delete(`/medias/${mediaId}`);
  return unwrap(response);
};

/* ---------- Export / import Excel ---------- */
export const exporterExcelReserves = async (chantierId) => {
  const response = await api.get(`/chantiers/${chantierId}/reserves/export`, { responseType: 'blob' });
  return response.data; // Blob XLSX
};

export const importerExcelReserves = async (chantierId, fichier) => {
  const fd = new FormData();
  fd.append('fichier', fichier);
  const response = await api.post(`/chantiers/${chantierId}/reserves/import`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
};
