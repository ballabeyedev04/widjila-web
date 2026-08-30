import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/**
 * Référentiel des phases de chantier — Pré-cloisons, Cloisons, OPR,
 * Réception, GPA…
 *
 * À NE PAS CONFONDRE avec les phases de PLANNING d'un chantier, servies par
 * `/chantiers/:id/phases` (chantierService) : celles-là portent des dates et
 * alimentent le calendrier. Les deux vivent dans la même table côté serveur
 * mais ne partagent aucune opération — voir `backend/src/models/phase.model.js`.
 *
 * Deux lectures, volontairement distinctes :
 *   - [listerPhases]       : liste PAGINÉE et filtrable (actives ET inactives),
 *                            pour l'écran d'administration ;
 *   - [listerPhasesActives]: liste COMPLÈTE des seules phases actives, non
 *                            paginée, pour les listes déroulantes de saisie.
 */

export const listerPhases = async ({ page = 1, limit = 20, search = '', actif = '' } = {}) => {
  const response = await api.get('/phases', {
    params: {
      page,
      limit,
      search: search?.trim() || undefined,
      // `actif` est un booléen : ne l'envoyer QUE s'il est explicitement
      // choisi, sinon `actif=''` filtrerait sur « inactive ».
      actif: actif === '' ? undefined : actif,
    },
  });
  return normalizeList(unwrap(response), 'phases');
};

export const listerPhasesActives = async () => {
  const response = await api.get('/phases/actives');
  return normalizeList(unwrap(response), 'phases');
};

export const getPhase = async (id) => {
  const response = await api.get(`/phases/${id}`);
  return unwrap(response)?.phase;
};

export const creerPhase = async (body) => {
  const response = await api.post('/phases', body);
  return unwrap(response)?.phase;
};

export const modifierPhase = async (id, body) => {
  const response = await api.put(`/phases/${id}`, body);
  return unwrap(response)?.phase;
};

/**
 * Bascule active/inactive — le geste NORMAL de retrait d'une phase, la
 * suppression étant refusée dès qu'une réserve s'y rattache.
 */
export const basculerActifPhase = async (id, actif) => {
  const response = await api.patch(`/phases/${id}/actif`, { actif });
  return unwrap(response)?.phase;
};

/**
 * Suppression — REFUSÉE par le serveur tant que des réserves utilisent cette
 * phase. Le message renvoyé porte le décompte et invite à désactiver ; il doit
 * être affiché tel quel.
 */
export const supprimerPhase = async (id) => {
  const response = await api.delete(`/phases/${id}`);
  return unwrap(response);
};
