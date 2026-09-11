/**
 * Namespace `layout` — navigation, mise en page et composants partagés.
 *
 * Couvre AdminLayout (barre latérale, barre supérieure, déconnexion) et les
 * composants transverses : Spinner, EmptyState, Modal, Pagination,
 * AccessDenied, FormControls, ErrorBoundary, MesChantiersCard, StatCard.
 *
 * Les chaînes réellement génériques (actions, états, champs, messages) restent
 * dans `common`, disponible ici par repli automatique : depuis ce namespace,
 * t('actions.fermer') résout sur common.actions.fermer.
 *
 * Langue : EN. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  actions: {
    rafraichir: 'Refresh the list',
  },
  tableau: {
    tronque: 'Showing {{affiches}} of {{total}} items. Refine your search to see the rest.',
  },
  sidebar: {
    espaceAdmin: 'Admin area',
    groupePilotage: 'Management',
    groupePlateforme: 'Platform',
    ouvrirMenu: 'Open menu',
    allerAuContenu: 'Skip to content',
    basculerMenu: 'Collapse / expand menu',
  },
  reseau: {
    horsLigneTitre: 'You are offline.',
    horsLigneTexte: 'Your entries will only be sent once the network is back — do not redo them.',
  },
  nav: {
    tableauBordChantier: 'Project dashboard',
    documents: 'Documents',
    abonnement: 'Subscription',
    prixAbonnements: 'Subscription pricing',
    phases: 'Phases',
    corpsEtat: 'Trades',
    typesDocument: 'Document types',
    typesIntervenant: 'Stakeholder types',
    typesInspection: 'Inspection types',
    tableauDeBord: 'Dashboard',
    chantiers: 'Projects',
    demandesChantier: 'Site requests',
    depotPlans: 'Upload plans',
    toutesReserves: 'All snags',
    tousPlans: 'All drawings',
    membres: 'Members',
    equipes: 'Teams',
    partenaires: 'Partners',
    organisation: 'Organization',
    notifications: 'Notifications',
    monProfil: 'My profile',
    vuePlateforme: 'Platform overview',
    utilisateurs: 'Users',
    organisations: 'Organizations',
    demandesInscription: 'Registration requests',
    demandesSuppression: 'Deletion requests',
    journalAudit: 'Audit log',
  },
  topbar: {
    titreParDefaut: 'Suivie Chantier',
    nouvelleReserve: 'New snag',
    notifications: 'Notifications',
    abonnementActif: 'Active subscription',
    planActif: 'Active',
    essaiRestant: 'Free trial — {{count}} day left',
    essaiRestant_other: 'Free trial — {{count}} days left',
    essaiCourt: 'Trial: {{jours}}d',
    essaiExpire: 'Trial expired',
    essaiExpireTitre: 'Trial expired — subscribe to a plan',
  },
  deconnexion: {
    titre: 'Sign out',
    confirmation: 'Are you sure you want to sign out?',
    succes: 'You have been signed out.',
  },
  vide: {
    message: 'Nothing to display for now.',
  },
  accesRefuse: {
    ressource: 'You do not have permission to access this resource.',
  },
  erreur: {
    titre: 'Something went wrong',
    inattendue: 'Unexpected error',
    reessayer: 'Try again',
    recharger: 'Reload page',
    reference: 'Reference',
  },
  formulaire: {
    selectionner: '— Select —',
    rechercher: 'Search…',
    aucunResultat: 'No results',
  },
  pagination: {
    intervalle: '{{from}}–{{to}} of {{total}}',
  },
  mesChantiers: {
    titre: 'My projects',
    affectations: 'Assigned to {{count}} project',
    affectations_other: 'Assigned to {{count}} projects',
    erreurChargement: 'Unable to load your projects',
    aucunTitre: 'No project assigned',
    aucunMessage: 'An administrator can assign you to projects so they appear here.',
    affecte: 'Assigned',
    ouvrir: 'Open',
  },
};
