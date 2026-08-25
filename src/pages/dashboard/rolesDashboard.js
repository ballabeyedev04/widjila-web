/**
 * Ce que chaque rôle voit sur son tableau de bord.
 *
 * ── Portée des données : à lire avant toute modification ────────────────────
 * Les endpoints `/dashboard/*` sont cadrés sur l'ORGANISATION, pas sur
 * l'utilisateur (voir `dashboard.service.js` : `where: { organisationId }`).
 * Cette configuration décide donc de ce qui est MIS EN AVANT selon le métier
 * de chacun, pas de ce à quoi il a droit — le filtrage par affectation
 * relèverait du serveur.
 *
 * Ce fichier ne remplace aucun contrôle d'accès : les routes restent gardées
 * par `RoleRoute` et le backend par `requireRole`.
 */

/** Blocs disponibles, référencés par les profils ci-dessous. */
export const BLOCS = {
  ALERTES: 'alertes',
  EVOLUTION: 'evolution',
  STATUTS: 'statuts',
  SEVERITES: 'severites',
  TOP_CHANTIERS: 'topChantiers',
  TOP_ENTREPRISES: 'topEntreprises',
  MES_CHANTIERS: 'mesChantiers',
};

/**
 * KPI proposés. `cle` sert à retrouver la valeur dans les données dérivées,
 * `i18n` le libellé, `inverse` marque les indicateurs dont la hausse est une
 * mauvaise nouvelle.
 */
export const KPI = {
  CHANTIERS: { cle: 'chantiers', i18n: 'chantiers', icone: 'HardHat', tone: 'navy', lien: '/chantiers' },
  RESERVES_OUVERTES: { cle: 'reservesOuvertes', i18n: 'reservesOuvertes', icone: 'AlertTriangle', tone: 'orange', inverse: true, lien: '/reserves' },
  RESERVES_RETARD: { cle: 'reservesEnRetard', i18n: 'reservesEnRetard', icone: 'CalendarClock', tone: 'red', inverse: true, lien: '/reserves' },
  TAUX_RESOLUTION: { cle: 'tauxResolution', i18n: 'tauxResolution', icone: 'CheckCircle2', tone: 'green', suffixe: '%' },
  RESERVES_TOTAL: { cle: 'reservesTotal', i18n: 'reservesTotal', icone: 'ClipboardList', tone: 'navy', lien: '/reserves' },
  INSPECTIONS: { cle: 'inspections', i18n: 'inspections', icone: 'ClipboardCheck', tone: 'blue' },
  PLANS: { cle: 'plans', i18n: 'plans', icone: 'FileImage', tone: 'blue', lien: '/plans' },
  DOCUMENTS: { cle: 'documents', i18n: 'documents', icone: 'FileText', tone: 'blue' },
  UTILISATEURS: { cle: 'utilisateurs', i18n: 'utilisateurs', icone: 'Users', tone: 'purple', lien: '/membres' },
};

/**
 * Profil par rôle.
 *
 * La question posée pour chacun : « qu'est-ce que cette personne doit savoir
 * dans les trois secondes qui suivent l'ouverture ? »
 */
const PROFILS = {
  // Vue d'ensemble de l'entreprise : volume, charge, ressources humaines.
  Admin: {
    kpis: [KPI.CHANTIERS, KPI.RESERVES_OUVERTES, KPI.RESERVES_RETARD, KPI.TAUX_RESOLUTION],
    kpisSecondaires: [KPI.UTILISATEURS, KPI.INSPECTIONS, KPI.PLANS, KPI.DOCUMENTS],
    blocs: [BLOCS.ALERTES, BLOCS.EVOLUTION, BLOCS.STATUTS, BLOCS.TOP_CHANTIERS, BLOCS.TOP_ENTREPRISES],
  },

  // Pilote l'avancement : ce qui bloque, qui traîne, où en est la résolution.
  ChefProjet: {
    kpis: [KPI.CHANTIERS, KPI.RESERVES_OUVERTES, KPI.RESERVES_RETARD, KPI.TAUX_RESOLUTION],
    kpisSecondaires: [KPI.INSPECTIONS, KPI.PLANS],
    blocs: [BLOCS.ALERTES, BLOCS.EVOLUTION, BLOCS.TOP_CHANTIERS, BLOCS.TOP_ENTREPRISES, BLOCS.MES_CHANTIERS],
  },

  // Terrain : la charge du jour et les échéances dépassées priment sur les
  // tendances annuelles.
  ConducteurTravaux: {
    kpis: [KPI.RESERVES_OUVERTES, KPI.RESERVES_RETARD, KPI.CHANTIERS, KPI.INSPECTIONS],
    kpisSecondaires: [KPI.PLANS, KPI.DOCUMENTS],
    blocs: [BLOCS.ALERTES, BLOCS.TOP_CHANTIERS, BLOCS.SEVERITES, BLOCS.MES_CHANTIERS],
  },

  // Contrôle qualité : la gravité et le flux de vérification comptent plus
  // que le nombre de chantiers.
  BureauControle: {
    kpis: [KPI.RESERVES_OUVERTES, KPI.RESERVES_RETARD, KPI.INSPECTIONS, KPI.TAUX_RESOLUTION],
    kpisSecondaires: [KPI.RESERVES_TOTAL, KPI.PLANS],
    blocs: [BLOCS.ALERTES, BLOCS.SEVERITES, BLOCS.STATUTS, BLOCS.EVOLUTION],
  },

  // Commanditaire : avancement et tenue des délais, pas le détail opérationnel.
  MaitreOuvrage: {
    kpis: [KPI.CHANTIERS, KPI.TAUX_RESOLUTION, KPI.RESERVES_RETARD, KPI.RESERVES_TOTAL],
    kpisSecondaires: [KPI.INSPECTIONS, KPI.DOCUMENTS],
    blocs: [BLOCS.EVOLUTION, BLOCS.STATUTS, BLOCS.TOP_CHANTIERS, BLOCS.MES_CHANTIERS],
  },

  // Conception et conformité : gravité, plans, suivi des levées.
  MaitreOeuvre: {
    kpis: [KPI.RESERVES_OUVERTES, KPI.TAUX_RESOLUTION, KPI.RESERVES_RETARD, KPI.PLANS],
    kpisSecondaires: [KPI.INSPECTIONS, KPI.DOCUMENTS],
    blocs: [BLOCS.ALERTES, BLOCS.SEVERITES, BLOCS.EVOLUTION, BLOCS.TOP_ENTREPRISES],
  },

  // Coordination inter-entreprises : qui bloque quoi.
  Pilote: {
    kpis: [KPI.RESERVES_OUVERTES, KPI.RESERVES_RETARD, KPI.CHANTIERS, KPI.TAUX_RESOLUTION],
    kpisSecondaires: [KPI.INSPECTIONS, KPI.RESERVES_TOTAL],
    blocs: [BLOCS.ALERTES, BLOCS.TOP_ENTREPRISES, BLOCS.TOP_CHANTIERS, BLOCS.EVOLUTION],
  },
};

/**
 * Profil de repli — volontairement sobre.
 *
 * Sert aux rôles qui n'atterrissent normalement pas ici (`Entreprise`,
 * `Client`, `SousTraitant` vont sur `/chantiers`, voir `ROLE_HOME`) mais qui
 * pourraient y arriver par une URL directe. Mieux vaut un écran réduit et
 * correct qu'un écran vide ou qu'une erreur.
 */
const PROFIL_DEFAUT = {
  kpis: [KPI.CHANTIERS, KPI.RESERVES_OUVERTES, KPI.RESERVES_RETARD, KPI.TAUX_RESOLUTION],
  kpisSecondaires: [],
  blocs: [BLOCS.ALERTES, BLOCS.MES_CHANTIERS],
};

export const profilPourRole = (role) => PROFILS[role] || PROFIL_DEFAUT;

export default PROFILS;
