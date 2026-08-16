import api, { setUser, clearUser, setStoredToken } from '../api.js';
import { unwrap } from '../helpers.js';
import i18n from '../../i18n/index.js';

/**
 * Service d'authentification — couvre le flux complet :
 *   login → (MFA → mfa-verify) → token + utilisateur.
 * Le refreshToken vit en cookie httpOnly (géré par l'intercepteur axios).
 *
 * Correctif (audit — Sécurité admin §2) : ce fichier contenait un compte de
 * secours en clair (email + mot de passe littéraux) qui ouvrait une session
 * LOCALE FICTIVE — sans jamais contacter le backend — dès que le login
 * échouait. Gardé par `import.meta.env.DEV`, mais un identifiant et un mot
 * de passe en clair dans le dépôt restent lisibles dans l'historique git et
 * dans tout build où la variable serait mal positionnée (bundle JS ouvert
 * dans les DevTools). Retiré entièrement plutôt que redésactivé : un
 * commentaire "à supprimer avant la prod" n'est pas une garantie.
 */

/** Connexion. Si MFA requis, renvoie `{ mfaRequise: true, utilisateur }`. */
export const login = async ({ identifiant, mot_de_passe }) => {
  const response = await api.post('/auth/login', { identifiant, mot_de_passe });
  const data = unwrap(response);

  if (data?.mfaRequise) {
    return { mfaRequise: true, utilisateur: data.utilisateur };
  }

  const { token, utilisateur } = data || {};
  if (token) setStoredToken(token);
  if (utilisateur) setUser(utilisateur);
  return { mfaRequise: false, utilisateur, token };
};

/** Valide le code TOTP après un login MFA (jeton MFA en cookie httpOnly). */
export const verifierMfa = async ({ code }) => {
  const response = await api.post('/auth/mfa-verify', { code });
  const data = unwrap(response);
  const { token, utilisateur } = data || {};
  if (token) setStoredToken(token);
  if (utilisateur) setUser(utilisateur);
  return { utilisateur, token };
};

/** Déconnexion : révoque le refresh token puis efface l'état local. */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // La déconnexion locale est prioritaire — on vide toujours l'état local.
  } finally {
    clearUser();
  }
};

/** Inscription d'un compte + son organisation. */
export const register = async (body) => {
  const response = await api.post('/auth/register', body);
  return unwrap(response);
};

/** Vérification de l'email (lien reçu par email). */
export const verifyEmail = async (token) => {
  const response = await api.post('/auth/verify-email', { token });
  return unwrap(response);
};

/* ---------- Validation côté client ---------- */
export const validateIdentifiant = (value) => {
  const cleaned = value.replace(/\s/g, '');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9]{7,20}$/;
  return emailRegex.test(value) || phoneRegex.test(cleaned);
};

export const validateLoginForm = (identifiant, motDePasse) => {
  const errors = {};
  if (!identifiant.trim()) errors.identifiant = i18n.t('auth:login.validation.identifiantRequis');
  else if (!validateIdentifiant(identifiant)) errors.identifiant = i18n.t('auth:login.validation.identifiantInvalide');
  if (!motDePasse) errors.motDePasse = i18n.t('auth:login.validation.motDePasseRequis');
  return errors;
};

/** Politique de mot de passe alignée sur le backend (8+ car., maj, min, chiffre, spécial). */
export const validatePassword = (password) => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'`~/]).{8,}$/;
  return strongRegex.test(password);
};
