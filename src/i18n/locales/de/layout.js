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
 * Langue : DE. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  actions: {
    rafraichir: 'Liste aktualisieren',
  },
  tableau: {
    tronque: '{{affiches}} von {{total}} Einträgen angezeigt. Verfeinern Sie die Suche, um die übrigen zu sehen.',
  },
  sidebar: {
    espaceAdmin: 'Admin-Bereich',
    groupePilotage: 'Steuerung',
    groupePlateforme: 'Plattform',
    ouvrirMenu: 'Menü öffnen',
    allerAuContenu: 'Zum Inhalt springen',
    basculerMenu: 'Menü ein-/ausklappen',
  },
  reseau: {
    horsLigneTitre: 'Sie sind offline.',
    horsLigneTexte: 'Ihre Eingaben werden erst gesendet, wenn das Netz zurück ist — bitte nicht wiederholen.',
  },
  nav: {
    tableauBordChantier: 'Baustellen-Dashboard',
    documents: 'Dokumente',
    abonnement: 'Abonnement',
    prixAbonnements: 'Abonnementpreise',
    phases: 'Phasen',
    corpsEtat: 'Gewerke',
    typesDocument: 'Dokumenttypen',
    typesIntervenant: 'Beteiligtentypen',
    typesInspection: 'Prüfungstypen',
    tableauDeBord: 'Übersicht',
    chantiers: 'Baustellen',
    demandesChantier: 'Baustellenanträge',
    depotPlans: 'Pläne hochladen',
    toutesReserves: 'Alle Mängel',
    tousPlans: 'Alle Pläne',
    membres: 'Mitglieder',
    equipes: 'Teams',
    partenaires: 'Partner',
    organisation: 'Organisation',
    notifications: 'Benachrichtigungen',
    monProfil: 'Mein Profil',
    vuePlateforme: 'Plattformübersicht',
    utilisateurs: 'Benutzer',
    organisations: 'Organisationen',
    demandesInscription: 'Registrierungsanfragen',
    demandesSuppression: 'Löschanfragen',
    journalAudit: 'Audit-Protokoll',
  },
  topbar: {
    titreParDefaut: 'Suivie Chantier',
    nouvelleReserve: 'Neuer Mangel',
    notifications: 'Benachrichtigungen',
    abonnementActif: 'Aktives Abonnement',
    planActif: 'Aktiv',
    essaiRestant: 'Kostenlose Testphase — noch {{count}} Tag',
    essaiRestant_other: 'Kostenlose Testphase — noch {{count}} Tage',
    essaiCourt: 'Test: {{jours}} T',
    essaiExpire: 'Testphase abgelaufen',
    essaiExpireTitre: 'Testphase abgelaufen — schließen Sie ein Abonnement ab',
  },
  deconnexion: {
    titre: 'Abmelden',
    confirmation: 'Möchten Sie sich wirklich abmelden?',
    succes: 'Sie wurden abgemeldet.',
  },
  vide: {
    message: 'Derzeit gibt es nichts anzuzeigen.',
  },
  accesRefuse: {
    ressource: 'Sie haben keine Berechtigung für diese Ressource.',
  },
  erreur: {
    titre: 'Ein Fehler ist aufgetreten',
    inattendue: 'Unerwarteter Fehler',
    reessayer: 'Erneut versuchen',
    recharger: 'Seite neu laden',
    reference: 'Referenz',
  },
  formulaire: {
    selectionner: '— Auswählen —',
    rechercher: 'Suchen…',
    aucunResultat: 'Keine Ergebnisse',
  },
  pagination: {
    intervalle: '{{from}}–{{to}} von {{total}}',
  },
  mesChantiers: {
    titre: 'Meine Baustellen',
    affectations: 'Zuweisungen zu {{count}} Projekt',
    affectations_other: 'Zuweisungen zu {{count}} Projekten',
    erreurChargement: 'Ihre Baustellen konnten nicht geladen werden',
    aucunTitre: 'Keine Baustelle zugewiesen',
    aucunMessage: 'Ein Administrator kann Ihnen Baustellen zuweisen, damit sie hier erscheinen.',
    affecte: 'Zugewiesen',
    ouvrir: 'Öffnen',
  },
};
