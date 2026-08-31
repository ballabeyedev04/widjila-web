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

/**
 * Pays proposés à l'inscription, et les identifiants d'entreprise de chacun.
 *
 * Le formulaire affichait SIRET, RCCM et NINEA à tout le monde : une
 * entreprise française se voyait demander un NINEA — identifiant sénégalais —
 * et une entreprise malienne n'avait nulle part où saisir son NIF.
 *
 * Route PUBLIQUE : c'est le formulaire d'INSCRIPTION qui la consomme, et son
 * visiteur n'a par définition pas encore de session.
 */
export const chargerPays = async () => {
  const response = await api.get('/referentiels/pays');
  return unwrap(response)?.pays ?? [];
};
