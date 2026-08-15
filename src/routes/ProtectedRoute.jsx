import { Navigate } from 'react-router-dom';
import { getStoredToken } from '../service/api.js';
import { useUser } from '../context/useUser.js';
import { homeForRole, roleAllowed } from '../utils/constants.js';
import Spinner from '../components/Spinner.jsx';

/* ════════════════════════════════════════════════════════════════════════
 * LES TROIS GARDES DE CE FICHIER NE SONT PAS UNE FRONTIÈRE DE SÉCURITÉ.
 * ════════════════════════════════════════════════════════════════════════
 * `ProtectedRoute`, `SuperAdminRoute` et `RoleRoute` tournent dans le
 * navigateur de l'utilisateur — donc sous SON contrôle total. Un token
 * falsifié dans sessionStorage, un rôle modifié via les DevTools, ou
 * simplement `fetch()` appelé directement en contournant React : rien de
 * tout ça n'est empêché ici. Ces gardes ÉVITENT SEULEMENT D'AFFICHER une
 * page à quelqu'un qui n'a manifestement pas le droit de la voir — un
 * confort d'interface, pas un contrôle d'accès.
 *
 * LA SEULE VÉRIFICATION QUI COMPTE VIT CÔTÉ BACKEND : les middlewares
 * `auth` / `checkActiveUser` / `requireRole` / `checkOrganisation` sur
 * chaque route de l'API (backend/src/middlewares/). Si vous ajoutez une
 * page ici sans que l'endpoint backend correspondant vérifie lui-même les
 * droits, la page "protégée" ne protège rien : elle affiche juste un joli
 * mur devant une porte restée grande ouverte à côté.
 *
 * Piège classique à ne pas reproduire : « cette page utilise
 * `SuperAdminRoute`, donc son appel API n'a pas besoin de son propre
 * `requireRole('Admin')` côté backend ». C'est faux, et c'est exactement le
 * genre d'hypothèse qui semble vraie pendant des mois avant de devenir un
 * incident.
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * `pretAuthentification` (UserContext) : tant que la tentative de
 * reconnexion silencieuse au démarrage (voir service/api.js) n'a pas
 * tranché, on affiche un spinner plutôt que de rediriger vers /login — sinon
 * un onglet rouvert avec un refreshToken encore valide (cookie httpOnly, 7
 * jours) serait éjecté pendant la fraction de seconde où cette tentative est
 * encore en vol.
 */

/**
 * Garde d'accès : bloque l'AFFICHAGE d'une page tant qu'un token + un
 * utilisateur ne sont pas présents en local (session apparemment valide).
 * Voir l'avertissement en tête de fichier — la vérification qui compte
 * reste entièrement côté backend.
 */
export default function ProtectedRoute({ children }) {
  const { user, pretAuthentification } = useUser();
  const token = getStoredToken();

  if (!pretAuthentification) return <Spinner />;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Garde pour les routes super-admin : exige le rôle 'Admin'. Confort
 * d'affichage uniquement — voir l'avertissement en tête de fichier. Chaque
 * endpoint `/admin/*` appelé par les pages qui utilisent cette garde DOIT
 * porter son propre `requireRole('Admin')` côté backend, indépendamment.
 */
export function SuperAdminRoute({ children }) {
  const { user, pretAuthentification } = useUser();
  const token = getStoredToken();

  if (!pretAuthentification) return <Spinner />;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Garde par rôle : n'autorise que les rôles listés (`roles`).
 * Le rôle 'Admin' passe toujours. Sinon redirection vers le portail
 * (page d'accueil) du rôle connecté — même avec l'URL tapée directement,
 * un utilisateur ne peut pas accéder à une page qui ne le concerne pas.
 */
export function RoleRoute({ roles, children }) {
  const { user, pretAuthentification } = useUser();
  const token = getStoredToken();

  if (!pretAuthentification) return <Spinner />;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!roleAllowed(user.role, roles)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}
