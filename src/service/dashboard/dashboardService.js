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
  return unwrap(response)?.stats;
};

export const statsParBatiment = async (chantierId) => {
  const response = await api.get(`/dashboard/chantiers/${chantierId}/par-batiment`);
  return unwrap(response)?.stats;
};

export const dureeTraitement = async (chantierId) => {
  const response = await api.get(`/dashboard/chantiers/${chantierId}/duree-traitement`);
  return unwrap(response)?.stats;
};

export const productivite = async (chantierId) => {
  const response = await api.get(`/dashboard/chantiers/${chantierId}/productivite`);
  return unwrap(response)?.stats;
};

// Sans `chantierId` : évolution de TOUTE l'organisation (`GET /dashboard/evolution`).
// Le tableau de bord global appelle `evolution()` sans argument — construire
// l'URL par chantier dans ce cas produisait `/dashboard/chantiers/undefined/evolution`
// (cast UUID invalide côté base, 500, courbe vide).
export const evolution = async (chantierId) => {
  const url = chantierId ? `/dashboard/chantiers/${chantierId}/evolution` : '/dashboard/evolution';
  const response = await api.get(url);
  return unwrap(response)?.stats;
};

export const exporterDashboard = async () => {
  const response = await api.get('/dashboard/export', { responseType: 'blob' });
  return response.data; // Blob XLSX
};
