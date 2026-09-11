/**
 * Référentiel des phases de chantier — Pré-cloisons, Cloisons, OPR, Réception,
 * GPA… C'est la liste proposée à la création d'une réserve, où la phase est
 * OBLIGATOIRE.
 *
 * À ne pas confondre avec les phases de PLANNING d'un chantier (avec dates),
 * dont les libellés vivent dans le namespace `chantier`.
 *
 * Namespace découvert automatiquement par `import.meta.glob` (voir
 * src/i18n/index.js) : le nom du fichier devient le nom du namespace.
 *
 * Langue : DE. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  titre: 'Phasen',
  sousTitre: '{{count}} Phase(n) im Referenzkatalog',
  nouvelle: 'Neue Phase',
  rechercher: 'Phase suchen…',
  chargement: 'Referenzkatalog wird geladen…',
  accesRefuse: 'Zugriff verweigert',
  verrouille: 'Standardkatalog',

  filtres: { toutes: 'Alle Status', actives: 'Nur aktive', inactives: 'Nur inaktive' },
  colonnes: { ordre: 'Reihenfolge', phase: 'Phase', portee: 'Geltungsbereich', statut: 'Status' },
  portee: { standard: 'Standard', organisation: 'Meine Organisation' },
  statut: { active: 'Aktiv', inactive: 'Inaktiv' },

  actions: {
    activer: 'Aktivieren', desactiver: 'Deaktivieren', modifier: 'Bearbeiten', supprimer: 'Löschen',
    annuler: 'Abbrechen', creer: 'Erstellen', enregistrer: 'Speichern',
  },

  champs: {
    nom: 'Name der Phase',
    description: 'Beschreibung',
    ordre: 'Anzeigereihenfolge',
    ordreAide: 'Bauablauf: Vor-Trennwände vor der Abnahme.',
    statut: 'Status',
  },

  modal: { nouvelle: 'Neue Phase', modifier: '„{{nom}}“ bearbeiten' },

  supprimer: {
    titre: '„{{nom}}“ löschen?',
    texte: 'Wird sie von Mängeln verwendet, wird das Löschen abgelehnt: deaktivieren Sie sie stattdessen.',
  },

  validation: { nomRequis: 'Der Name der Phase ist erforderlich.' },

  messages: {
    creee: 'Phase erstellt.',
    modifiee: 'Phase geändert.',
    supprimee: 'Phase gelöscht.',
    activee: 'Phase aktiviert.',
    desactivee: 'Phase deaktiviert.',
    creationImpossible: 'Erstellen nicht möglich',
    modificationImpossible: 'Änderung nicht möglich',
    suppressionImpossible: 'Löschen nicht möglich',
    actionImpossible: 'Aktion fehlgeschlagen',
  },

  vide: { titre: 'Keine Phase', message: 'Fügen Sie die Phasen Ihrer Baustellen hinzu.' },

  selecteur: {
    label: 'Phase',
    choisir: '— Phase wählen —',
    chargement: 'Wird geladen…',
    requise: 'Bitte wählen Sie eine Phase aus.',
    erreur: 'Phasen konnten nicht geladen werden.',
    reessayer: 'Erneut versuchen',
  },
};
