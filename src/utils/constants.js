/**
 * Constantes métier partagées : libellés + badges (alignées sur les ENUM
 * des validations backend). Utile pour afficher proprement partout.
 *
 * Les `label` ci-dessous sont les libellés FRANÇAIS de référence. Ils servent
 * de repli quand une clé n'est pas encore traduite : l'affichage passe par
 * `enumLabel()`, qui interroge le namespace i18n `enums`.
 */
import i18n from '../i18n/index.js';

/**
 * Libellé traduit d'une valeur d'énumération métier (statut, rôle, type…).
 * Les clés du namespace `enums` sont à plat : `en_cours`, `ChefProjet`, `pv`…
 *
 * Note : cette fonction lit la langue courante au moment de l'appel. Appelée
 * depuis un composant qui utilise `useTranslation`, elle est ré-évaluée au
 * changement de langue — c'est le cas de Badge et des pages traduites.
 */
export const enumLabel = (key, fallback) => {
  if (!key) return fallback ?? '—';
  return i18n.t(`enums:${key}`, { defaultValue: fallback ?? key });
};

export const ROLES = {
  Admin: { label: 'Administrateur', tone: 'primary' },
  ChefProjet: { label: 'Chef de projet', tone: 'info' },
  ConducteurTravaux: { label: 'Conducteur de travaux', tone: 'warning' },
  BureauControle: { label: 'Bureau de contrôle', tone: 'success' },
  Entreprise: { label: 'Entreprise', tone: 'neutral' },
  Client: { label: 'Client', tone: 'neutral' },
  MaitreOuvrage: { label: "Maître d'ouvrage", tone: 'primary' },
  MaitreOeuvre: { label: "Maître d'œuvre", tone: 'success' },
};

export const roleLabel = (role) => enumLabel(role, ROLES[role]?.label || role || '—');

/* ════════════════════════════════════════════════════════════════════════
 * Rôles & portails — alignés sur les groupes backend (src/config/roles.js).
 * ════════════════════════════════════════════════════════════════════════ */

/** Gestion opérationnelle du chantier (structure, plans, docs, inspections…). */
export const ROLES_OPERATIONNELS = ['ChefProjet', 'ConducteurTravaux', 'MaitreOeuvre'];

/** Opérationnel + bureau de contrôle. */
export const ROLES_OPERATIONNELS_CONTROLE = ['ChefProjet', 'ConducteurTravaux', 'BureauControle', 'MaitreOeuvre'];

/** Pilotage / validation — le maître d'ouvrage décide et valide chaque étape. */
export const ROLES_PILOTAGE = ['ChefProjet', 'ConducteurTravaux', 'BureauControle', 'MaitreOuvrage', 'MaitreOeuvre'];

/** Gestion de l'organisation, des membres et des équipes. */
export const ROLES_GESTION = ['Admin', 'ChefProjet', 'MaitreOuvrage'];

/** Interventions sur les réserves (signalement, correction, validation). */
export const ROLES_RESERVE_INTERVENANTS = ['ChefProjet', 'ConducteurTravaux', 'BureauControle', 'MaitreOuvrage', 'MaitreOeuvre', 'Entreprise'];

/**
 * Page d'accueil après connexion, par rôle (le « portail » de l'utilisateur).
 * Tous arrivent sur le tableau de bord : le menu affiché dépend du rôle.
 */
export const ROLE_HOME = {
  Admin: '/dashboard',
  ChefProjet: '/dashboard',
  ConducteurTravaux: '/dashboard',
  BureauControle: '/dashboard',
  Entreprise: '/chantiers',
  Client: '/chantiers',
  MaitreOuvrage: '/dashboard',
  MaitreOeuvre: '/dashboard',
};

/** Route d'accueil par défaut d'un rôle (fallback : tableau de bord). */
export const homeForRole = (role) => ROLE_HOME[role] || '/dashboard';

/** Vrai si le rôle de l'utilisateur appartient à la liste autorisée. */
export const roleAllowed = (role, allowed = []) => {
  if (role === 'Admin') return true;
  return allowed.includes(role);
};

export const STATUTS_CHANTIER = {
  en_preparation: { label: 'En préparation', tone: 'info' },
  en_cours: { label: 'En cours', tone: 'success' },
  en_pause: { label: 'En pause', tone: 'warning' },
  archive: { label: 'Archivé', tone: 'neutral' },
  cloture: { label: 'Clôturé', tone: 'danger' },
};

export const STATUTS_RESERVE = {
  creee: { label: 'Créée', tone: 'neutral' },
  affectee: { label: 'Affectée', tone: 'info' },
  en_cours: { label: 'En cours', tone: 'warning' },
  corrigee: { label: 'Corrigée', tone: 'primary' },
  a_verifier: { label: 'À vérifier', tone: 'warning' },
  validee: { label: 'Validée', tone: 'success' },
  refusee: { label: 'Refusée', tone: 'danger' },
  rouverte: { label: 'Rouverte', tone: 'danger' },
  en_retard: { label: 'En retard', tone: 'danger' },
  cloturee: { label: 'Clôturée', tone: 'neutral' },
};

export const SEVERITES = {
  faible: { label: 'Faible', tone: 'info' },
  moyenne: { label: 'Moyenne', tone: 'warning' },
  haute: { label: 'Haute', tone: 'danger' },
  critique: { label: 'Critique', tone: 'danger' },
};

export const CATEGORIES_RESERVE = {
  maconnerie: 'Maçonnerie',
  gros_oeuvre: 'Gros œuvre',
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  carrelage: 'Carrelage',
  peinture: 'Peinture',
  menuiserie: 'Menuiserie',
  etancheite: 'Étanchéité',
  isolation: 'Isolation',
  autre: 'Autre',
};

export const STATUTS_INSPECTION = {
  planifiee: { label: 'Planifiée', tone: 'info' },
  en_cours: { label: 'En cours', tone: 'warning' },
  terminee: { label: 'Terminée', tone: 'success' },
  signee: { label: 'Signée', tone: 'primary' },
};

export const TYPES_INSPECTION = {
  inspection: 'Inspection',
  opr: 'OPR',
  visite_contradictoire: 'Visite contradictoire',
};

export const STATUTS_CONVOCATION = {
  invite: { label: 'Invité', tone: 'neutral' },
  accepte: { label: 'Accepté', tone: 'success' },
  decline: { label: 'Décliné', tone: 'danger' },
  present: { label: 'Présent', tone: 'success' },
  absent: { label: 'Absent', tone: 'danger' },
};

export const STATUTS_UTILISATEUR = {
  actif: { label: 'Actif', tone: 'success' },
  inactif: { label: 'Inactif', tone: 'danger' },
  en_attente_validation: { label: 'En attente', tone: 'warning' },
};

export const TYPES_DOCUMENT = {
  plan: 'Plan',
  contrat: 'Contrat',
  doe: 'DOE',
  pv: 'PV',
  compte_rendu: 'Compte rendu',
  rapport: 'Rapport',
  notice: 'Notice',
  photo: 'Photo',
  autre: 'Autre',
};

export const STATUTS_DOCUMENT = {
  actif: { label: 'Actif', tone: 'success' },
  archive: { label: 'Archivé', tone: 'neutral' },
};

export const TYPES_PARTENAIRE = {
  client: 'Client',
  maitre_ouvrage: 'Maître d\'ouvrage',
  maitre_oeuvre: 'Maître d\'œuvre',
  sous_traitant: 'Sous-traitant',
  fournisseur: 'Fournisseur',
  bureau_controle: 'Bureau de contrôle',
  autre: 'Autre',
};

export const ABONNEMENTS = {
  Starter: { label: 'Starter', tone: 'neutral' },
  Pro: { label: 'Pro', tone: 'info' },
  Business: { label: 'Business', tone: 'warning' },
  Enterprise: { label: 'Enterprise', tone: 'primary' },
};

/**
 * Langues proposées à l'utilisateur. Chaque entrée doit avoir sa traduction
 * dans src/i18n/locales/*.js et être acceptée par le schéma Joi du backend
 * (modules/account/validation/account.validation.js).
 * Les libellés restent dans la langue d'origine — usage courant des sélecteurs
 * de langue : on reconnaît « Deutsch » même quand l'interface est en français.
 */
export const LANGUES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
];
