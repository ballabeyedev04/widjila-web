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

/**
 * Prépare l'e-mail d'envoi SANS rien envoyer.
 *
 * Deux appels et non un : le client a demandé que rien ne parte « sans
 * validation de l'utilisateur ». Celui-ci compose et renvoie ce qui partirait
 * — destinataire, copies, objet, message, pièce jointe — pour que l'écran
 * l'affiche avant confirmation.
 */
export const preparerEnvoiRapport = async (id) => {
  const response = await api.get(`/rapports/${id}/envoi`);
  return unwrap(response)?.envoi;
};

/**
 * Envoie réellement le rapport, sur confirmation.
 *
 * `exclure` ne porte que des RETRAITS : la liste des destinataires est
 * recalculée par le serveur. On ne lui transmet donc pas d'adresses à ajouter,
 * seulement celles que l'utilisateur a décochées.
 */
export const envoyerRapportParMail = async (id, { exclure = [] } = {}) => {
  const response = await api.post(`/rapports/${id}/envoi`, { exclure });
  return unwrap(response);
};
