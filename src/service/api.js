import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

import { installerDeduplication } from './dedupe.js';
import { estRequeteVersApi, cheminSuspect } from './securite.js';
import { reporterErreurRequete } from '../utils/monitoring.js';

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

// Un même écrit ne part jamais deux fois : voir `dedupe.js`. Posé AVANT les
// intercepteurs pour envelopper `api.post`/`put`/`patch`/`delete` — le rejeu
// après renouvellement de session passe, lui, par `api(config)` et n'est donc
// pas concerné.
installerDeduplication(api);

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

/* ---------- Intercepteur requête : chemin, puis jeton ---------- */
api.interceptors.request.use(
  (config) => {
    // 1. Aucune traversée de chemin (`..`, même encodée) : un paramètre de
    //    route piégé ne doit pas faire appeler une autre ressource que celle
    //    que l'écran croit viser. Voir `securite.js#cheminSuspect`.
    const url = config.url ?? '';
    if (cheminSuspect(url)) {
      return Promise.reject(Object.assign(
        new Error('Chemin de requête refusé'),
        { code: 'CHEMIN_REFUSE', config },
      ));
    }

    // 2. Le jeton ne part QUE vers l'API. Il était joint à toute requête, y
    //    compris vers une URL absolue d'un autre domaine — une adresse de
    //    stockage signée, un CDN — qui aurait reçu la session de l'utilisateur.
    //    Voir `securite.js#estRequeteVersApi`.
    const token = getStoredToken();
    if (token && estRequeteVersApi(url, config.baseURL ?? API_BASE_URL, window.location.origin)) {
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

/* ---------- Coordination entre onglets ---------- */
//
// La session vit dans deux mondes : le jeton d'accès, propre à CHAQUE onglet
// (sessionStorage), et le jeton de rafraîchissement, PARTAGÉ par tous les
// onglets (cookie). Deux défauts en découlaient.
//
// DÉCONNEXION INCOMPLÈTE. « Se déconnecter » dans un onglet révoquait le cookie
// mais laissait les autres onglets ouverts avec un jeton d'accès valide —
// jusqu'à une heure (`JWT_EXPIRES_IN`). Sur un poste partagé de chantier, la
// personne suivante trouvait une session ouverte dans l'onglet d'à côté.
// Désormais, la fin de session est ANNONCÉE à tous les onglets.
//
// RENOUVELLEMENTS CONCURRENTS. Le jeton de rafraîchissement est à usage unique
// (rotation, `auth.service.js#refresh`). Deux onglets qui le présentaient au
// même instant — typiquement à la restauration d'une session de navigateur —
// voyaient l'un réussir et l'autre essuyer « jeton révoqué », ce qui le
// déconnectait à tort. Le renouvellement est maintenant sérialisé entre
// onglets : le second attend, puis part avec le cookie déjà renouvelé.

/** Canal partagé par les onglets de l'application — créé à la première utilisation. */
let canal = null;
const canalSession = () => {
  if (canal || typeof BroadcastChannel === 'undefined') return canal;
  canal = new BroadcastChannel('sc-session');
  // Hors navigateur (tests), un canal ouvert retiendrait le processus.
  /** @type {any} */ (canal).unref?.();
  return canal;
};

/** Prévient les autres onglets que la session est terminée. */
export const annoncerFinDeSession = () => {
  try {
    canalSession()?.postMessage({ type: 'fin-session' });
  } catch {
    /* navigateur sans canal : chaque onglet se déconnectera à l'expiration */
  }
};

/**
 * Appelle `rappel` quand un AUTRE onglet annonce la fin de la session.
 * @param {() => void} rappel
 * @returns {() => void} désabonnement
 */
export const ecouterFinDeSession = (rappel) => {
  const c = canalSession();
  if (!c) return () => {};
  /** @param {MessageEvent} e */
  const surMessage = (e) => { if (e?.data?.type === 'fin-session') rappel(); };
  c.addEventListener('message', surMessage);
  return () => c.removeEventListener('message', surMessage);
};

/**
 * Exécute un renouvellement de session sous un verrou partagé par les onglets.
 * Sans l'API Web Locks (navigateur ancien), l'appel part tel quel.
 * @template T
 * @param {() => Promise<T>} tache
 * @returns {Promise<T>}
 */
export const avecVerrouRefresh = (tache) => (
  typeof navigator !== 'undefined' && navigator.locks?.request
    // `request` rend la promesse de la tâche elle-même : les types de la
    // bibliothèque DOM l'emballent une fois de trop.
    ? /** @type {Promise<T>} */ (/** @type {unknown} */ (navigator.locks.request('sc-refresh', tache)))
    : tache()
);

/* ---------- Refresh silencieux ---------- */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
};

/**
 * Porte sur l'erreur elle-même son identifiant de requête et le code
 * uniforme du serveur.
 *
 * Le serveur les renvoie dans tout corps d'erreur (`requestId`,
 * `error.code`) et dans l'en-tête `X-Request-Id` ; ils n'étaient lus nulle
 * part. Une erreur remontée au monitoring ne désignait donc aucune ligne des
 * journaux serveur. Aucun en-tête n'est ENVOYÉ par le web : l'identifiant
 * est créé par le serveur.
 */
export const enrichirErreur = (error) => {
  const reponse = error?.response;
  if (!reponse) return error;
  const corps = reponse.data && typeof reponse.data === 'object' ? reponse.data : null;
  const entetes = reponse.headers;
  error.requestId = corps?.requestId
    ?? (typeof entetes?.get === 'function' ? entetes.get('x-request-id') : entetes?.['x-request-id'])
    ?? undefined;
  error.codeErreur = corps?.error?.code ?? corps?.code;
  return error;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Diagnostic d'abord : identifiant de requête et code serveur sur
    // l'erreur, puis signalement des PANNES (5xx, réseau, délai) — les refus
    // métier 4xx restent affichés à l'utilisateur et ne sont pas envoyés.
    enrichirErreur(error);
    reporterErreurRequete(error);
    const original = error.config;

    const isAuthRoute =
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/mfa-verify') ||
      original?.url?.includes('/auth/transfert-web');

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
        const refreshRes = await avecVerrouRefresh(() => api.post('/auth/refresh'));
        const refreshPayload = refreshRes.data?.data || refreshRes.data;
        const newToken = refreshPayload?.token;
        if (newToken) setStoredToken(newToken);
        processQueue(null);
        return api(original);
      } catch (erreurBrute) {
        // Une valeur attrapée est de type inconnu : `throw` accepte n'importe
        // quoi. On dit ce qu'on en attend plutôt que de le supposer.
        const refreshError = /** @type {{ response?: { status?: number } }} */ (erreurBrute);
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
          // Le serveur a refusé la session : elle est morte pour TOUS les
          // onglets, qui partagent le même cookie.
          annoncerFinDeSession();
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
    const refreshRes = await avecVerrouRefresh(() => api.post('/auth/refresh'));
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

/* ---------- Transfert de session depuis l'application mobile ---------- */
//
// Le mobile n'encaisse rien : « Choisir cette formule » ouvre `/abonnement`
// dans le navigateur du téléphone, qui n'a jamais vu l'utilisateur se
// connecter. Sans session, la page tombait sur des 401 puis sur un refresh
// sans cookie, et renvoyait vers la connexion.
//
// Le mobile ajoute donc à l'adresse un code de transfert — deux minutes, usage
// unique, voir `auth.service.js#_generateTransfertWeb` côté backend — que la
// page échange ici contre une session ordinaire.
//
// Le code voyage dans le FRAGMENT (`#transfert=…`) et non dans la requête : un
// fragment n'est jamais envoyé au serveur qui sert la page, ni recopié dans
// l'en-tête `Referer` vers Stripe. Il est effacé de l'adresse AVANT l'échange,
// pour ne survivre ni dans l'historique ni dans un lien partagé.

const CLE_TRANSFERT = 'transfert';

/** Lit le code de transfert du fragment, et l'efface aussitôt de l'adresse. */
const extraireCodeTransfert = () => {
  const fragment = window.location.hash.replace(/^#/, '');
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const code = params.get(CLE_TRANSFERT);
  if (!code) return null;

  params.delete(CLE_TRANSFERT);
  const reste = params.toString();
  // `history.state` conservé : React Router y range sa propre clé de navigation.
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}${reste ? `#${reste}` : ''}`,
  );
  return code;
};

/** Échange en cours ou terminé — un seul par chargement de page. */
let transfert = null;

/**
 * Échange le code de transfert présent dans l'adresse contre une session.
 *
 * Mémorisé : le code est à usage unique, et le mode strict de React exécute
 * deux fois les effets en développement. Un second échange échouerait et
 * masquerait le premier ; tous les appelants partagent donc la même promesse.
 *
 * @returns {Promise<null | { utilisateur: object } | { echec: true }>}
 *   `null` sans code dans l'adresse ; `{ echec: true }` si le serveur l'a
 *   refusé (expiré, déjà servi) — la page invite alors à se connecter.
 */
export const consommerTransfertWeb = () => {
  if (!transfert) {
    transfert = (async () => {
      const code = extraireCodeTransfert();
      if (!code) return null;
      try {
        const res = await api.post('/auth/transfert-web/echange', { code });
        const { token, utilisateur } = res.data?.data || {};
        if (!token || !utilisateur) return { echec: true };
        setStoredToken(token);
        setUser(utilisateur);
        return { utilisateur };
      } catch {
        return { echec: true };
      }
    })();
  }
  return transfert;
};

export default api;
