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
 * Langue : EN. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  document: { titre: 'Document types' },
  intervenant: { titre: 'Stakeholder types' },
  inspection: { titre: 'Inspection types' },

  sousTitre: '{{count}} type(s) in the list',
  nouveau: 'New type',
  rechercher: 'Search for a type…',
  accesRefuse: 'Access denied',
  verrouille: 'Standard list',

  filtres: { tous: 'All', actifs: 'Active', inactifs: 'Inactive' },
  colonnes: { nom: 'Name', code: 'Code', portee: 'Scope', ordre: 'Order', statut: 'Status' },
  portee: { standard: 'Standard', organisation: 'My company' },
  statut: { actif: 'Active', inactif: 'Inactive' },

  actions: {
    activer: 'Activate',
    desactiver: 'Deactivate',
    modifier: 'Edit',
    supprimer: 'Delete',
    annuler: 'Cancel',
    enregistrer: 'Save',
  },

  vide: {
    titre: 'No types',
    message: 'Add the types your company needs. The standard list always remains available.',
  },

  modal: {
    titreCreation: 'New type',
    titreEdition: 'Edit type',
  },

  champs: {
    code: 'Code',
    codeAide: 'Technical key, lowercase, no spaces or accents (e.g. ppsps).',
    codeFige: 'The code cannot be changed: it is stored in existing records.',
    nom: 'Display name',
    description: 'Description',
    ordre: 'Display order',
    ordreAide: 'Lowest first.',
    statut: 'Status',
  },

  validation: {
    nomRequis: 'Name is required',
    codeRequis: 'Code is required',
    codeFormat: 'Lowercase letters, digits and underscores only',
  },

  supprimer: {
    titre: 'Delete “{{nom}}”?',
    texte: 'Deletion is refused if records use this type. In that case, deactivate it: it will no longer be offered, and existing records stay unchanged.',
  },

  messages: {
    cree: 'Type created',
    modifie: 'Type updated',
    supprime: 'Type deleted',
    active: 'Type activated',
    desactive: 'Type deactivated',
    echec: 'Could not save',
    actionImpossible: 'Action failed',
    suppressionImpossible: 'Could not delete',
  },
};
