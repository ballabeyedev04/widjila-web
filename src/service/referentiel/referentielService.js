import api from '../api.js';
import { unwrap } from '../helpers.js';

/**
 * Énumérations métier (statuts, sévérités, types) servies par le backend.
 *
 * Ces listes étaient RECOPIÉES à la main dans `utils/constants.js`. Un statut
 * ajouté côté serveur restait alors invisible ici : le filtre ne le proposait
 * pas, et le badge s'affichait sans libellé — sans la moindre erreur pour le
 * signaler.
 *
 * Le serveur renvoie les CODES bruts ; les libellés restent traduits côté
 * client par `enumLabel`, pour suivre la langue de l'utilisateur.
 */
export const chargerEnums = async () => {
  const response = await api.get('/referentiels/enums');
  return unwrap(response)?.enums ?? {};
};
