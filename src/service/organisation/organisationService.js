import api from '../api.js';
import { unwrap, normalizeList, toFormData, LIMITE_MAX_PAGE } from '../helpers.js';

/** Module Organisation : profil de l'entreprise, filiales, membres, équipes, partenaires. */

export const getOrganisation = async () => {
  const response = await api.get('/organisation');
  return unwrap(response)?.organisation;
};

export const modifierOrganisation = async (data) => {
  const fd = toFormData(data);
  const response = await api.put('/organisation', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response)?.organisation;
};

/* ---------- Filiales & agences ---------- */
export const listerFiliales = async ({ limit = LIMITE_MAX_PAGE } = {}) => {
  const response = await api.get('/organisation/filiales', { params: { limit } });
  return normalizeList(unwrap(response), 'filiales');
};

export const creerFiliale = async (body) => {
  const response = await api.post('/organisation/filiales', body);
  return unwrap(response);
};

export const creerAgence = async (filialeId, body) => {
  const response = await api.post(`/organisation/filiales/${filialeId}/agences`, body);
  return unwrap(response);
};

export const getOrganigramme = async () => {
  const response = await api.get('/organisation/organigramme');
  return unwrap(response);
};

/* ---------- Membres ---------- */
export const listerMembres = async ({ page = 1, limit = 20, search = '', role = '', statut = '' } = {}) => {
  const response = await api.get('/organisation/membres', {
    params: { page, limit, search: search?.trim() || undefined, role: role || undefined, statut: statut || undefined },
  });
  return normalizeList(unwrap(response), 'membres');
};

export const ajouterMembre = async (body) => {
  const response = await api.post('/organisation/membres', body);
  return unwrap(response); // { utilisateur, motDePasseTemporaire }
};

export const modifierMembre = async (id, body) => {
  const response = await api.put(`/organisation/membres/${id}`, body);
  return unwrap(response);
};

export const supprimerMembre = async (id) => {
  const response = await api.delete(`/organisation/membres/${id}`);
  return unwrap(response);
};

export const importerMembres = async (fichier, role) => {
  const fd = new FormData();
  fd.append('fichier', fichier);
  if (role) fd.append('role', role);
  const response = await api.post('/organisation/membres/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response); // { results }
};

/* ---------- Équipes ---------- */
export const listerEquipes = async () => {
  const response = await api.get('/organisation/equipes');
  return normalizeList(unwrap(response), 'equipes');
};

export const creerEquipe = async ({ nom, description, membreIds }) => {
  const response = await api.post('/organisation/equipes', { nom, description, membreIds });
  return unwrap(response);
};

export const ajouterMembresEquipe = async (id, membreIds) => {
  const response = await api.post(`/organisation/equipes/${id}/membres`, { membreIds });
  return unwrap(response);
};

export const retirerMembreEquipe = async (id, membreId) => {
  const response = await api.delete(`/organisation/equipes/${id}/membres/${membreId}`);
  return unwrap(response);
};

export const supprimerEquipe = async (id) => {
  const response = await api.delete(`/organisation/equipes/${id}`);
  return unwrap(response);
};

/* ---------- Partenaires ---------- */
export const listerPartenaires = async () => {
  const response = await api.get('/organisation/partenaires');
  return normalizeList(unwrap(response), 'partenaires');
};

export const listerPartenairesChantier = async (chantierId) => {
  const response = await api.get(`/chantiers/${chantierId}/partenaires`);
  return normalizeList(unwrap(response), 'partenaires');
};

export const creerPartenaire = async (body) => {
  const response = await api.post('/organisation/partenaires', body);
  return unwrap(response);
};

export const creerPartenaireChantier = async (chantierId, body) => {
  const response = await api.post(`/chantiers/${chantierId}/partenaires`, body);
  return unwrap(response);
};

export const modifierPartenaire = async (id, body) => {
  const response = await api.put(`/partenaires/${id}`, body);
  return unwrap(response);
};

export const supprimerPartenaire = async (id) => {
  const response = await api.delete(`/partenaires/${id}`);
  return unwrap(response);
};
