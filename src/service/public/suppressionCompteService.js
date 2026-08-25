import api from '../api.js';
import { unwrap } from '../helpers.js';

/**
 * Dépôt d'une demande de suppression de compte — route PUBLIQUE.
 *
 * Aucun jeton n'est nécessaire : le demandeur peut avoir désinstallé
 * l'application, voire ne plus pouvoir se connecter. C'est précisément
 * l'exigence de Google Play (URL accessible sans compte).
 */
export const deposerDemandeSuppression = async ({ email, objet }) => {
  const response = await api.post('/suppression-compte', { email, objet });
  return unwrap(response);
};
