import api from '../api.js';
import { unwrap, normalizeList, toFormData } from '../helpers.js';

/** Module Compte : profil, sécurité, MFA, sessions, connexions, RGPD. */

export const getMe = async () => {
  const response = await api.get('/account/me');
  const data = unwrap(response);
  return data?.utilisateur;
};

export const listerMesChantiers = async () => {
  const response = await api.get('/account/chantiers');
  return normalizeList(unwrap(response), 'chantiers');
};

/** Met à jour le profil (multipart — photoProfil optionnelle). */
export const modifierProfil = async (data) => {
  const fd = toFormData(data);
  const response = await api.put('/account/profil', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap(response);
};

export const changerMotDePasse = async ({ ancien_mot_de_passe, nouveau_mot_de_passe }) => {
  const response = await api.put('/account/change-password', {
    ancien_mot_de_passe,
    nouveau_mot_de_passe,
  });
  return unwrap(response);
};

export const oublierMotDePasse = async ({ email }) => {
  const response = await api.post('/account/forgot-password', { email });
  return unwrap(response);
};

export const reinitialiserMotDePasse = async ({ email, otp, nouveau_mot_de_passe }) => {
  const response = await api.post('/account/reset-password', { email, otp, nouveau_mot_de_passe });
  return unwrap(response);
};

export const enregistrerDeviceToken = async ({ token, platform }) => {
  const response = await api.post('/account/device-token', { token, platform });
  return unwrap(response);
};

/* ---------- Historique de connexions & sessions ---------- */
export const listerConnexions = async ({ page = 1, limit = 20 } = {}) => {
  const response = await api.get('/account/connexions', { params: { page, limit } });
  return normalizeList(unwrap(response), 'connexions');
};

export const listerSessions = async () => {
  const response = await api.get('/account/sessions');
  return normalizeList(unwrap(response), 'sessions');
};

export const revoquerSession = async (id) => {
  const response = await api.delete(`/account/sessions/${id}`);
  return unwrap(response);
};

export const revoquerToutesSessions = async () => {
  const response = await api.delete('/account/sessions');
  return unwrap(response);
};

/* ---------- MFA ---------- */
export const provisionMfa = async () => {
  const response = await api.post('/account/mfa/provision');
  return unwrap(response); // { secret, otpauthUrl, qr }
};

export const activerMfa = async ({ code, secret }) => {
  const response = await api.post('/account/mfa/enable', { code, secret });
  return unwrap(response);
};

export const desactiverMfa = async ({ code }) => {
  const response = await api.post('/account/mfa/disable', { code });
  return unwrap(response);
};

/* ---------- RGPD ---------- */
export const exporterDonnees = async () => {
  const response = await api.get('/account/export-data');
  return unwrap(response);
};

export const supprimerCompte = async () => {
  const response = await api.delete('/account/delete-account');
  return unwrap(response);
};
