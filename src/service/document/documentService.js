import api from '../api.js';
import { unwrap, normalizeList, toFormData } from '../helpers.js';

/** Module Documents : GED du chantier, archivage, signatures. */

export const uploaderDocument = async (chantierId, { fichier, type }) => {
  const fd = toFormData({ fichier, type });
  const response = await api.post(`/chantiers/${chantierId}/documents`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response)?.document;
};

export const listerDocuments = async (chantierId, { page = 1, limit = 20, search = '', type = '', statut = '' } = {}) => {
  const response = await api.get(`/chantiers/${chantierId}/documents`, {
    params: { page, limit, search: search?.trim() || undefined, type: type || undefined, statut: statut || undefined },
  });
  return normalizeList(unwrap(response), 'documents');
};

export const archiverDocument = async (id) => {
  const response = await api.post(`/documents/${id}/archive`);
  return unwrap(response)?.document;
};

export const restaurerDocument = async (id) => {
  const response = await api.post(`/documents/${id}/restaurer`);
  return unwrap(response)?.document;
};

export const signerDocument = async (id, { donnees }) => {
  const response = await api.post(`/documents/${id}/signature`, { donnees });
  return unwrap(response)?.signature;
};

export const listerSignaturesDocument = async (id) => {
  const response = await api.get(`/documents/${id}/signatures`);
  return normalizeList(unwrap(response), 'signatures');
};

export const supprimerDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return unwrap(response);
};
