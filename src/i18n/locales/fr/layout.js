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
 * Langue : FR. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  actions: {
    rafraichir: 'Rafraîchir la liste',
  },
  tableau: {
    tronque: '{{affiches}} éléments affichés sur {{total}}. Affinez la recherche pour voir les autres.',
  },
  sidebar: {
    espaceAdmin: 'Espace admin',
    groupePilotage: 'Pilotage',
    groupePlateforme: 'Plateforme',
    ouvrirMenu: 'Ouvrir le menu',
    allerAuContenu: 'Aller au contenu',
    basculerMenu: 'Réduire / agrandir le menu',
  },
  reseau: {
    horsLigneTitre: 'Vous êtes hors ligne.',
    horsLigneTexte: 'Vos saisies ne partiront qu’au retour du réseau — ne les refaites pas.',
  },
  nav: {
    tableauBordChantier: 'Tableau de bord chantier',
    documents: 'Documents',
    abonnement: 'Abonnement',
    prixAbonnements: 'Prix abonnements',
    phases: 'Phases',
    corpsEtat: 'Corps d’état',
    typesDocument: 'Types de document',
    typesIntervenant: 'Types d’intervenant',
    typesInspection: 'Types d’inspection',
    tableauDeBord: 'Tableau de bord',
    chantiers: 'Chantiers',
    demandesChantier: 'Demandes de chantier',
    depotPlans: 'Envoi de plans',
    toutesReserves: 'Toutes les réserves',
    tousPlans: 'Tous les plans',
    membres: 'Membres',
    equipes: 'Équipes',
    partenaires: 'Partenaires',
    organisation: 'Organisation',
    notifications: 'Notifications',
    monProfil: 'Mon profil',
    vuePlateforme: 'Vue plateforme',
    utilisateurs: 'Utilisateurs',
    organisations: 'Organisations',
    demandesInscription: "Demandes d'inscription",
    demandesSuppression: "Demandes de suppression",
    journalAudit: "Journal d'audit",
  },
  topbar: {
    titreParDefaut: 'Suivie Chantier',
    nouvelleReserve: 'Nouvelle réserve',
    notifications: 'Notifications',
    abonnementActif: 'Abonnement actif',
    planActif: 'Actif',
    essaiRestant: 'Essai gratuit — {{count}} jour restant',
    essaiRestant_other: 'Essai gratuit — {{count}} jours restants',
    essaiCourt: 'Essai : {{jours}}j',
    essaiExpire: 'Essai expiré',
    essaiExpireTitre: 'Essai expiré — souscrivez un abonnement',
  },
  deconnexion: {
    titre: 'Déconnexion',
    confirmation: 'Voulez-vous vraiment vous déconnecter ?',
    succes: 'Vous êtes déconnecté.',
  },
  vide: {
    message: 'Aucun élément à afficher pour le moment.',
  },
  accesRefuse: {
    ressource: "Vous n'avez pas les droits nécessaires pour accéder à cette ressource.",
  },
  erreur: {
    titre: 'Une erreur est survenue',
    inattendue: 'Erreur inattendue',
    reessayer: 'Réessayer',
  },
  formulaire: {
    selectionner: '— Sélectionner —',
    rechercher: 'Rechercher…',
    aucunResultat: 'Aucun résultat',
  },
  pagination: {
    intervalle: '{{from}}–{{to}} sur {{total}}',
  },
  mesChantiers: {
    titre: 'Mes chantiers',
    affectations: 'Affectations sur {{count}} projet',
    affectations_other: 'Affectations sur {{count}} projets',
    erreurChargement: 'Impossible de charger vos chantiers',
    aucunTitre: 'Aucun chantier affecté',
    aucunMessage: "Un administrateur peut vous affecter à des chantiers pour qu'ils apparaissent ici.",
    affecte: 'Affecté',
    ouvrir: 'Ouvrir',
  },
};
