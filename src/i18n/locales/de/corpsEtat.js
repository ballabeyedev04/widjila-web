/**
 * Corps d'état — catalogue des métiers / types de travaux du BTP.
 *
 * Namespace découvert automatiquement par `import.meta.glob` (voir
 * src/i18n/index.js) : le nom du fichier devient le nom du namespace.
 *
 * Langue : DE. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  titre: 'Gewerke',
  sousTitre: '{{count}} Gewerk(e) im Katalog',
  nouveau: 'Neues Gewerk',
  rechercher: 'Gewerk suchen…',
  chargement: 'Katalog wird geladen…',
  accesRefuse: 'Zugriff verweigert',
  verrouille: 'Standardkatalog',

  filtres: {
    tous: 'Alle Status',
    actifs: 'Nur aktive',
    inactifs: 'Nur inaktive',
  },

  colonnes: {
    metier: 'Gewerk',
    code: 'Code',
    portee: 'Geltungsbereich',
    ordre: 'Reihenfolge',
    statut: 'Status',
  },

  portee: {
    standard: 'Standard',
    organisation: 'Meine Organisation',
  },

  statut: {
    actif: 'Aktiv',
    inactif: 'Inaktiv',
  },

  actions: {
    fermer: 'Schließen',
    activer: 'Aktivieren',
    desactiver: 'Deaktivieren',
    modifier: 'Bearbeiten',
    supprimer: 'Löschen',
    annuler: 'Abbrechen',
    creer: 'Erstellen',
    enregistrer: 'Speichern',
  },

  champs: {
    nom: 'Name des Gewerks',
    code: 'Code',
    codeAide: 'Technischer Schlüssel, Kleinbuchstaben ohne Akzente. Im Zweifel leer lassen.',
    description: 'Beschreibung',
    ordre: 'Anzeigereihenfolge',
    ordreAide: 'Bauablauf: Rohbau vor Ausbau.',
    statut: 'Status',
  },

  modal: {
    nouveau: 'Neues Gewerk',
    modifier: '„{{nom}}“ bearbeiten',
  },

  supprimer: {
    titre: '„{{nom}}“ löschen?',
    texte: 'Wird es von Mängeln verwendet, wird das Löschen abgelehnt: deaktivieren Sie es stattdessen.',
  },

  validation: {
    nomRequis: 'Der Name des Gewerks ist erforderlich.',
  },

  messages: {
    cree: 'Gewerk erstellt.',
    modifie: 'Gewerk geändert.',
    supprime: 'Gewerk gelöscht.',
    active: 'Gewerk aktiviert.',
    desactive: 'Gewerk deaktiviert.',
    creationImpossible: 'Erstellen nicht möglich',
    modificationImpossible: 'Änderung nicht möglich',
    suppressionImpossible: 'Löschen nicht möglich',
    actionImpossible: 'Aktion fehlgeschlagen',
  },

  vide: {
    titre: 'Kein Gewerk',
    message: 'Fügen Sie die Gewerke und Arbeitsarten Ihrer Baustellen hinzu.',
  },

  // Écran d'historique des réserves d'un métier, filtrable par phase.
  historique: {
    titre: 'Verlauf — {{nom}}',
    toutesPhases: 'Alle Phasen',
    sansPhase: 'Ohne Phase',
    creeLe: 'Erstellt am',
    corrigeeLe: 'Behoben am',
    videTitre: 'Kein Mangel',
    videMessage: 'Diesem Gewerk ist kein Mangel zugeordnet.',
    voir: 'Verlauf anzeigen',
  },

  selecteur: {
    label: 'Gewerk',
    aucun: '— Keines —',
    chargement: 'Wird geladen…',
  },
};
