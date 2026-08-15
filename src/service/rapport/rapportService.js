import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/** Module Rapports : génération PDF/liste des rapports de chantier. */

export const genererRapport = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/rapports/generer`, body);
  return unwrap(response)?.rapport;
};

export const listerRapports = async (chantierId) => {
  const response = await api.get(`/chantiers/${chantierId}/rapports`);
  return normalizeList(unwrap(response), 'rapports');
};

export const getRapport = async (id) => {
  const response = await api.get(`/rapports/${id}`);
  return unwrap(response)?.rapport;
};

export const supprimerRapport = async (id) => {
  const response = await api.delete(`/rapports/${id}`);
  return unwrap(response);
};
