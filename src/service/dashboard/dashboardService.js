import api from '../api.js';
import { unwrap } from '../helpers.js';

/** Module Tableau de bord : stats globales et par chantier. */

export const statsGlobales = async () => {
  const response = await api.get('/dashboard');
  return unwrap(response)?.stats;
};

export const statsChantier = async (chantierId) => {
  const response = await api.get(`/dashboard/chantiers/${chantierId}`);
  return unwrap(response)?.stats;
};

export const statsParEntreprise = async () => {
  const response = await api.get('/dashboard/par-entreprise');
  return unwrap(response);
};

export const statsParBatiment = async (chantierId) => {
  const response = await api.get(`/dashboard/chantiers/${chantierId}/par-batiment`);
  return unwrap(response);
};

export const dureeTraitement = async (chantierId) => {
  const response = await api.get(`/dashboard/chantiers/${chantierId}/duree-traitement`);
  return unwrap(response);
};

export const productivite = async (chantierId) => {
  const response = await api.get(`/dashboard/chantiers/${chantierId}/productivite`);
  return unwrap(response);
};

export const evolution = async (chantierId) => {
  const response = await api.get(`/dashboard/chantiers/${chantierId}/evolution`);
  return unwrap(response);
};

export const exporterDashboard = async () => {
  const response = await api.get('/dashboard/export', { responseType: 'blob' });
  return response.data; // Blob XLSX
};
