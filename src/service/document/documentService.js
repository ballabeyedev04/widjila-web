import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/** Module Documents : GED du chantier, archivage, signatures. */

/**
 * Nom sous lequel le fichier part au serveur.
 *
 * Le serveur enregistre le NOM DU FICHIER reçu (`nom_fichier`) — il n'a pas
 * de champ « nom » à part. Le nom saisi dans le formulaire était envoyé dans
 * un champ que le serveur ne connaît pas, qui l'écartait : ce que l'on tapait
 * n'était jamais conservé. Il passe désormais par le nom du fichier, extension
 * d'origine comprise (c'est elle qui dit au poste quelle application ouvrira
 * le document).
 */
export const nomDeDepot = (fichier, nom) => {
  const saisi = String(nom || '').trim();
  const origine = fichier?.name || 'document';
  if (!saisi) return origine;
  const i = origine.lastIndexOf('.');
  const extension = i > 0 ? origine.slice(i) : '';
  return extension && saisi.toLowerCase().endsWith(extension.toLowerCase()) ? saisi : `${saisi}${extension}`;
};

export const uploaderDocument = async (chantierId, { fichier, nom, type }) => {
  const fd = new FormData();
  if (type) fd.append('type', type);
  fd.append('fichier', fichier, nomDeDepot(fichier, nom));
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

/**
 * @param {string} id
 * @param {{ donnees?: unknown }} [options] Tracé de la signature (facultatif).
 */
export const signerDocument = async (id, { donnees } = {}) => {
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
