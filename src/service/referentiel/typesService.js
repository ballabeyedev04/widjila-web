import api from '../api.js';
import { unwrap, normalizeList } from '../helpers.js';

/**
 * Référentiels de TYPE administrables — documents, intervenants, inspections.
 *
 * Les trois exposent exactement le même contrat côté serveur ; cette fabrique
 * produit leurs six fonctions à partir du seul chemin de base. Trois fichiers
 * identiques à une URL près se seraient mis à diverger au premier correctif.
 *
 * Deux lectures, volontairement distinctes :
 *   - [lister] : liste PAGINÉE et filtrable, pour l'écran d'administration
 *     (types actifs ET inactifs) ;
 *   - [listerActifs] : liste COMPLÈTE des seuls types actifs, non paginée,
 *     pour les listes déroulantes des formulaires.
 *
 * Les mélanger obligerait soit à paginer une liste déroulante — où l'on doit
 * tout voir d'un coup — soit à proposer des types désactivés à la saisie.
 */
export function creerServiceTypes(base) {
  return {
    lister: async ({ page = 1, limit = 20, search = '', actif = '' } = {}) => {
      const response = await api.get(base, {
        params: {
          page,
          limit,
          ...(search ? { search } : {}),
          // Chaîne vide = pas de filtre : l'envoyer ferait lire `actif=false`
          // au backend, qui ne montrerait plus que les types désactivés.
          ...(actif !== '' ? { actif } : {}),
        },
      });
      const data = unwrap(response);
      return normalizeList(data, 'types');
    },

    listerActifs: async () => {
      const response = await api.get(`${base}/actifs`);
      return unwrap(response)?.types || [];
    },

    detail: async (id) => unwrap(await api.get(`${base}/${id}`))?.type,

    creer: async (body) => unwrap(await api.post(base, body))?.type,

    modifier: async (id, body) => unwrap(await api.put(`${base}/${id}`, body))?.type,

    basculerActif: async (id, actif) =>
      unwrap(await api.patch(`${base}/${id}/actif`, { actif }))?.type,

    supprimer: async (id) => unwrap(await api.delete(`${base}/${id}`)),
  };
}

/**
 * Les trois référentiels, indexés par la clé utilisée dans les routes du web.
 *
 * `types-intervenant` côté URL, `partenaires` en base : le mot du métier a
 * changé, pas la table.
 */
export const SERVICES_TYPES = {
  document: creerServiceTypes('/types-document'),
  intervenant: creerServiceTypes('/types-intervenant'),
  inspection: creerServiceTypes('/types-inspection'),
};
