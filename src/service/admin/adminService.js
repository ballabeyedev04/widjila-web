import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/**
 * Module super-admin (plateforme) — accessible au rôle 'Admin' uniquement :
 * utilisateurs, organisations, statistiques, journal d'audit.
 */

/* ---------- Utilisateurs ---------- */
export const listerUtilisateurs = async ({ page = 1, limit = 20, search = '', role = '', statut = '', organisationId = '' } = {}) => {
  const response = await api.get('/admin/utilisateurs', {
    params: {
      page, limit,
      search: search?.trim() || undefined,
      role: role || undefined,
      statut: statut || undefined,
      organisationId: organisationId || undefined,
    },
  });
  return normalizeList(unwrap(response), 'utilisateurs');
};

export const getUtilisateur = async (id) => {
  const response = await api.get(`/admin/utilisateurs/${id}`);
  return unwrap(response)?.utilisateur;
};

export const creerUtilisateurAdmin = async (body) => {
  const response = await api.post('/admin/utilisateurs', body);
  return unwrap(response);
};

export const modifierUtilisateurAdmin = async (id, body) => {
  const response = await api.put(`/admin/utilisateurs/${id}`, body);
  return unwrap(response)?.utilisateur;
};

export const changerRoleUtilisateur = async (id, role) => {
  const response = await api.patch(`/admin/utilisateurs/${id}/role`, { role });
  return unwrap(response)?.utilisateur;
};

export const modifierPermissionsUtilisateur = async (id, permissions) => {
  const response = await api.put(`/admin/utilisateurs/${id}/permissions`, { permissions });
  return unwrap(response)?.utilisateur;
};

export const supprimerUtilisateurAdmin = async (id) => {
  const response = await api.delete(`/admin/utilisateurs/${id}`);
  return unwrap(response);
};

/* ---------- Organisations ---------- */
export const listerOrganisations = async ({ page = 1, limit = 20, search = '', statut = '', abonnement = '' } = {}) => {
  const response = await api.get('/admin/organisations', {
    params: {
      page, limit,
      search: search?.trim() || undefined,
      statut: statut || undefined,
      abonnement: abonnement || undefined,
    },
  });
  return normalizeList(unwrap(response), 'organisations');
};

export const getOrganisationAdmin = async (id) => {
  const response = await api.get(`/admin/organisations/${id}`);
  return unwrap(response)?.organisation;
};

export const creerOrganisationAdmin = async (body) => {
  const response = await api.post('/admin/organisations', body);
  return unwrap(response)?.organisation;
};

export const modifierOrganisationAdmin = async (id, body) => {
  const response = await api.put(`/admin/organisations/${id}`, body);
  return unwrap(response)?.organisation;
};

export const supprimerOrganisationAdmin = async (id) => {
  const response = await api.delete(`/admin/organisations/${id}`);
  return unwrap(response);
};

/* ---------- Statistiques ---------- */
export const statsPlateforme = async () => {
  const response = await api.get('/admin/statistiques');
  return unwrap(response);
};

export const croissanceInscriptions = async (mois = 6) => {
  const response = await api.get('/admin/statistiques/croissance', { params: { mois } });
  return unwrap(response);
};

/* ---------- Journal d'audit ---------- */
export const listerAuditLogs = async ({ page = 1, limit = 20, action = '', cibleType = '' } = {}) => {
  const response = await api.get('/admin/audit-logs', {
    params: { page, limit, action: action || undefined, cibleType: cibleType || undefined },
  });
  return normalizeList(unwrap(response), 'logs');
};
