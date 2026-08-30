import api from '../api.js';
import { unwrap, normalizeList, LIMITE_MAX_PAGE } from '../helpers.js';

/** Module Rapports : génération PDF/liste des rapports de chantier. */

export const genererRapport = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/rapports/generer`, body);
  return unwrap(response)?.rapport;
};

export const listerRapports = async (chantierId, { limit = LIMITE_MAX_PAGE } = {}) => {
  const response = await api.get(`/chantiers/${chantierId}/rapports`, { params: { limit } });
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
