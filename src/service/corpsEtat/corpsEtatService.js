import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/**
 * Corps d'état — catalogue des métiers / types de travaux du BTP.
 *
 * Deux lectures, volontairement distinctes :
 *   - [listerCorpsEtat] : liste PAGINÉE et filtrable, pour l'écran
 *     d'administration du catalogue (actifs ET inactifs) ;
 *   - [listerCorpsEtatActifs] : liste COMPLÈTE des seuls métiers actifs, non
 *     paginée, pour les listes déroulantes des formulaires de réserve.
 *
 * Les mélanger obligerait soit à paginer une liste déroulante — où l'on doit
 * pouvoir tout voir d'un coup — soit à charger les métiers désactivés dans un
 * formulaire, où ils n'ont plus rien à faire.
 */

export const listerCorpsEtat = async ({ page = 1, limit = 20, search = '', actif = '' } = {}) => {
  const response = await api.get('/corps-etat', {
    params: {
      page,
      limit,
      search: search?.trim() || undefined,
      // `actif` est un booléen : ne l'envoyer QUE s'il est explicitement
      // choisi, sinon `actif=''` filtrerait sur « inactif ».
      actif: actif === '' ? undefined : actif,
    },
  });
  return normalizeList(unwrap(response), 'corpsEtat');
};

export const listerCorpsEtatActifs = async () => {
  const response = await api.get('/corps-etat/actifs');
  return normalizeList(unwrap(response), 'corpsEtat');
};

export const getCorpsEtat = async (id) => {
  const response = await api.get(`/corps-etat/${id}`);
  return unwrap(response)?.corpsEtat;
};

/**
 * Répartition par phase des réserves d'un corps d'état — l'en-tête de l'écran
 * d'historique (« Électricité → Pré-cloisons 3, Cloisons 5, OPR 2 »).
 *
 * La LISTE des réserves vient séparément de
 * `listerToutesReserves({ corpsEtatId, phaseId })` : elle est paginée et
 * filtrable de son côté, la dupliquer ici la figerait.
 */
export const getHistoriqueCorpsEtat = async (id) => {
  const response = await api.get(`/corps-etat/${id}/historique`);
  return unwrap(response);
};

export const creerCorpsEtat = async (body) => {
  const response = await api.post('/corps-etat', body);
  return unwrap(response)?.corpsEtat;
};

export const modifierCorpsEtat = async (id, body) => {
  const response = await api.put(`/corps-etat/${id}`, body);
  return unwrap(response)?.corpsEtat;
};

/**
 * Bascule actif/inactif.
 *
 * Route dédiée plutôt qu'un PUT complet : c'est le geste courant du
 * catalogue, et il reste ainsi lisible dans le journal d'audit.
 */
export const basculerActifCorpsEtat = async (id, actif) => {
  const response = await api.patch(`/corps-etat/${id}/actif`, { actif });
  return unwrap(response)?.corpsEtat;
};

/**
 * Suppression — REFUSÉE par le serveur tant que des réserves utilisent ce
 * corps d'état. Le message renvoyé porte le décompte et invite à désactiver ;
 * il doit être affiché tel quel.
 */
export const supprimerCorpsEtat = async (id) => {
  const response = await api.delete(`/corps-etat/${id}`);
  return unwrap(response);
};
