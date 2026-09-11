/**
 * Référentiels de TYPE administrables — documents, intervenants, inspections.
 *
 * Un seul namespace pour les trois écrans : ils partagent le même composant
 * (`pages/referentiel/ReferentielTypes.jsx`) et ne diffèrent que par leur
 * titre. Trois namespaces auraient triplé les mêmes libellés.
 *
 * Namespace découvert automatiquement par `import.meta.glob` (voir
 * src/i18n/index.js) : le nom du fichier devient le nom du namespace.
 *
 * Langue : DE. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  document: { titre: 'Dokumenttypen' },
  intervenant: { titre: 'Beteiligtentypen' },
  inspection: { titre: 'Prüfungstypen' },

  sousTitre: '{{count}} Typ(en) im Verzeichnis',
  nouveau: 'Neuer Typ',
  rechercher: 'Typ suchen…',
  accesRefuse: 'Zugriff verweigert',
  verrouille: 'Standardverzeichnis',

  filtres: { tous: 'Alle', actifs: 'Aktiv', inactifs: 'Inaktiv' },
  colonnes: { nom: 'Name', code: 'Code', portee: 'Geltungsbereich', ordre: 'Reihenfolge', statut: 'Status' },
  portee: { standard: 'Standard', organisation: 'Mein Unternehmen' },
  statut: { actif: 'Aktiv', inactif: 'Inaktiv' },

  actions: {
    activer: 'Aktivieren',
    desactiver: 'Deaktivieren',
    modifier: 'Bearbeiten',
    supprimer: 'Löschen',
    annuler: 'Abbrechen',
    enregistrer: 'Speichern',
  },

  vide: {
    titre: 'Keine Typen',
    message: 'Fügen Sie die Typen Ihres Unternehmens hinzu. Das Standardverzeichnis bleibt immer verfügbar.',
  },

  modal: {
    titreCreation: 'Neuer Typ',
    titreEdition: 'Typ bearbeiten',
  },

  champs: {
    code: 'Code',
    codeAide: 'Technischer Schlüssel, Kleinbuchstaben, ohne Leerzeichen oder Akzente (z. B. ppsps).',
    codeFige: 'Der Code kann nicht geändert werden: Er ist in bestehenden Daten gespeichert.',
    nom: 'Anzeigename',
    description: 'Beschreibung',
    ordre: 'Anzeigereihenfolge',
    ordreAide: 'Kleinste zuerst.',
    statut: 'Status',
  },

  validation: {
    nomRequis: 'Name ist erforderlich',
    codeRequis: 'Code ist erforderlich',
    codeFormat: 'Nur Kleinbuchstaben, Ziffern und Unterstriche',
  },

  supprimer: {
    titre: '„{{nom}}“ löschen?',
    texte: 'Das Löschen wird abgelehnt, wenn Datensätze diesen Typ verwenden. Deaktivieren Sie ihn in diesem Fall: Er wird nicht mehr angeboten, bestehende Datensätze bleiben unverändert.',
  },

  messages: {
    cree: 'Typ erstellt',
    modifie: 'Typ geändert',
    supprime: 'Typ gelöscht',
    active: 'Typ aktiviert',
    desactive: 'Typ deaktiviert',
    echec: 'Speichern fehlgeschlagen',
    actionImpossible: 'Aktion fehlgeschlagen',
    suppressionImpossible: 'Löschen fehlgeschlagen',
  },
};
