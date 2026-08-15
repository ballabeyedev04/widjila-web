import { useState, useCallback, useEffect } from 'react';
import {
  getUser as getStoredUser,
  setUser as persistUser,
  clearUser as clearPersistedUser,
  getStoredToken,
  tenterReconnexionSilencieuse,
} from '../service/api.js';
import { UserContext } from './userContextInstance.js';
import { identifierUtilisateur, effacerUtilisateur } from '../utils/monitoring.js';

/**
 * Source de vérité unique pour l'utilisateur connecté. Toutes les pages qui
 * affichent une info du profil (sidebar, topbar, etc.) lisent ce contexte.
 *
 * `pretAuthentification` (audit — Admin §3) : passe à `true` une fois la
 * tentative de reconnexion silencieuse tranchée (succès, échec, ou inutile
 * car une session était déjà en mémoire). Les gardes de route
 * (ProtectedRoute.jsx) attendent ce signal avant de décider d'une
 * redirection vers /login — sans ça, un onglet rouvert avec un
 * refreshToken encore valide serait redirigé pendant la fraction de
 * seconde où la reconnexion silencieuse est encore en vol.
 */
export function UserProvider({ children }) {
  const [user, setUserState] = useState(() => getStoredUser());
  const [pretAuthentification, setPretAuthentification] = useState(false);

  useEffect(() => {
    let annule = false;

    async function hydrater() {
      // Session déjà présente en mémoire (même onglet, pas de coupure) :
      // rien à récupérer.
      const utilisateurEnMemoire = getStoredUser();
      if (getStoredToken() && utilisateurEnMemoire) {
        identifierUtilisateur(utilisateurEnMemoire);
        if (!annule) setPretAuthentification(true);
        return;
      }
      // sessionStorage vide (onglet fermé puis rouvert, app relancée sur le
      // terrain…) : tente de restaurer la session via le refreshToken
      // (cookie httpOnly) avant de conclure qu'il faut se reconnecter.
      const utilisateur = await tenterReconnexionSilencieuse();
      if (!annule) {
        if (utilisateur) {
          setUserState(utilisateur);
          identifierUtilisateur(utilisateur);
        }
        setPretAuthentification(true);
      }
    }

    hydrater();
    return () => { annule = true; };
  }, []);

  const setUser = useCallback((newUser) => {
    persistUser(newUser);
    setUserState(newUser);
    identifierUtilisateur(newUser);
  }, []);

  const clearUser = useCallback(() => {
    clearPersistedUser();
    setUserState(null);
    effacerUtilisateur();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, clearUser, pretAuthentification }}>
      {children}
    </UserContext.Provider>
  );
}
