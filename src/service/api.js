import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

/**
 * Client HTTP central de l'admin.
 *
 * - Base URL : `VITE_API_BASE_URL` (production = URL absolue du backend) ou
 *   `/api/v1` en dev (proxy Vite → backend local, aucun CORS à gérer).
 * - `withCredentials: true` : indispensable pour que les cookies httpOnly
 *   (refreshToken, mfaToken) posés par le backend circulent.
 * - Access token stocké en sessionStorage et injecté en header `Authorization`.
 * - Refresh silencieux : à tout 401 (hors login/mfa/refresh), on appelle
 *   POST /auth/refresh (le refreshToken vit en cookie httpOnly) et on rejoue
 *   la requête. Les requêtes concurrentes sont mises en file d'attente.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
});

/* ---------- Token + utilisateur en sessionStorage ---------- */
const TOKEN_KEY = 'sc_at';
const TOKEN_EXP_KEY = 'sc_exp';
const USER_KEY = 'sc_user';

const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

export const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  const payload = decodeToken(token);
  if (payload?.exp) sessionStorage.setItem(TOKEN_EXP_KEY, payload.exp.toString());
};

export const clearStoredToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXP_KEY);
};

const isTokenExpired = () => {
  const exp = parseInt(sessionStorage.getItem(TOKEN_EXP_KEY) || '0', 10);
  return exp > 0 && Date.now() > exp * 1000;
};

/* ---------- Utilisateur ---------- */
export const setUser = (user) => {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  const user = sessionStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const clearUser = () => {
  sessionStorage.removeItem(USER_KEY);
  clearStoredToken();
};

/* ---------- Intercepteur requête : Bearer token ---------- */
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Faut-il DÉCONNECTER après l'échec d'un renouvellement de session ?
 *
 * Extrait de l'intercepteur pour être testable : c'est une règle de sécurité,
 * et une règle de sécurité qu'on ne peut pas tester finit par dériver.
 *
 * @param {number|undefined} statut  code HTTP renvoyé par `/auth/refresh`,
 *   ou `undefined` si le serveur n'a pas répondu du tout (coupure réseau).
 * @param {boolean} jetonLocalExpire  l'access token local est-il périmé ?
 * @returns {boolean}
 */
export const doitDeconnecter = (statut, jetonLocalExpire) => {
  // Le serveur a RÉPONDU que le refresh est refusé : la session est morte.
  // 400 compris — `auth.controller.js#refresh` lève un BadRequestError quand
  // le refreshToken est absent ou invalide, et c'est le cas le plus fréquent.
  if (statut === 400 || statut === 401 || statut === 403) return true;

  // Le serveur n'a pas répondu (undefined) ou a renvoyé une 5xx : panne
  // passagère probable. On ne déconnecte que si le jeton local est de toute
  // façon périmé — sinon un utilisateur en 3G sur un chantier perdrait sa
  // session à la première requête ratée.
  return jetonLocalExpire;
};

/* ---------- Refresh silencieux ---------- */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const isAuthRoute =
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/mfa-verify');

    if (error?.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      if (isRefreshing) {
        // Drapeau posé AVANT la mise en file : sans lui, une requête rejouée
        // qui reçoit un nouveau 401 relancerait un second cycle de
        // rafraîchissement pour rien.
        original._retry = true;
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(original))
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await api.post('/auth/refresh');
        const refreshPayload = refreshRes.data?.data || refreshRes.data;
        const newToken = refreshPayload?.token;
        if (newToken) setStoredToken(newToken);
        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);

        // ── Quand faut-il DÉCONNECTER ? ──────────────────────────────────
        //
        // La condition d'origine (`isTokenExpired()`) regardait l'expiration
        // de l'access token LOCAL. Elle laissait passer le cas le plus
        // fréquent d'une session révoquée : le serveur invalide le
        // refreshToken (changement de mot de passe, compte désactivé,
        // sessions révoquées, `tokenVersion` incrémentée) alors que l'access
        // token local n'a pas encore expiré. L'utilisateur restait alors
        // « connecté » avec un jeton mort : chaque appel échouait en 401,
        // chaque 401 relançait un refresh voué à échouer, et rien ne le
        // ramenait à l'écran de connexion.
        //
        // On déconnecte donc dès que le serveur RÉPOND que le refresh est
        // refusé. Une panne réseau ou une erreur 5xx n'entre pas dans ce cas :
        // déconnecter sur une coupure passagère ferait perdre sa session à un
        // utilisateur en 3G sur un chantier, alors que le refreshToken est
        // parfaitement valide.
        //
        // 400 fait partie de la liste, et c'est le cas le plus FRÉQUENT :
        // `auth.controller.js#refresh` lève un `BadRequestError` (400, pas
        // 401) quand le refreshToken est absent ou invalide — et il efface
        // même le cookie au passage. Ne tester que 401/403 laissait donc
        // passer exactement la situation qu'on cherche à rattraper.
        if (doitDeconnecter(refreshError?.response?.status, isTokenExpired())) {
          clearUser();
          // Garde anti-boucle : sur la page de connexion elle-même, une
          // redirection relancerait un chargement complet en continu.
          if (!window.location.pathname.startsWith('/login')) {
            // `replace` et non `href` : la page morte ne doit pas rester dans
            // l'historique, sinon « précédent » y ramène après reconnexion.
            window.location.replace('/login');
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Reconnexion silencieuse au démarrage de l'app (audit — Admin §3).
 *
 * sessionStorage (token ET utilisateur) est vidé à chaque fermeture
 * d'onglet — un choix de sécurité générique qui, sur le terrain (chantier,
 * 3G, téléphone mis en veille puis onglet relancé), obligeait à une
 * reconnexion manuelle complète à chaque fois, alors que le refreshToken
 * (cookie httpOnly, 7 jours — voir REFRESH_COOKIE_OPTS côté backend) était
 * toujours valide. Cette fonction rejoue PROACTIVEMENT, au chargement de
 * l'app, le même échange que l'intercepteur 401 ci-dessus (réactif, après
 * un premier appel raté) : elle tente `/auth/refresh` puis récupère le
 * profil via `/account/me` (le refresh ne renvoie que le token, pas
 * l'utilisateur).
 *
 * Ne renforce ni n'affaiblit la sécurité : le refreshToken httpOnly reste
 * la seule source de vérité de la session, exactement comme avant. Ça
 * évite seulement de perdre la session localement quand il ne le fallait pas.
 *
 * @returns {Promise<object|null>} l'utilisateur restauré, ou `null` si
 *   aucune session n'est récupérable (l'app retombe normalement sur /login).
 */
export const tenterReconnexionSilencieuse = async () => {
  try {
    const refreshRes = await api.post('/auth/refresh');
    const newToken = refreshRes.data?.data?.token;
    if (!newToken) return null;
    setStoredToken(newToken);

    const meRes = await api.get('/account/me');
    const utilisateur = meRes.data?.data?.utilisateur;
    if (!utilisateur) return null;

    setUser(utilisateur);
    return utilisateur;
  } catch {
    clearUser();
    return null;
  }
};

export default api;
