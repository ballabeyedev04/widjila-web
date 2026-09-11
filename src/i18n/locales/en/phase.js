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
 * Langue : EN. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  titre: 'Phases',
  sousTitre: '{{count}} phase(s) in the reference list',
  nouvelle: 'New phase',
  rechercher: 'Search a phase…',
  chargement: 'Loading the reference list…',
  accesRefuse: 'Access denied',
  verrouille: 'Standard reference list',

  filtres: { toutes: 'All statuses', actives: 'Active only', inactives: 'Inactive only' },
  colonnes: { ordre: 'Order', phase: 'Phase', portee: 'Scope', statut: 'Status' },
  portee: { standard: 'Standard', organisation: 'My organisation' },
  statut: { active: 'Active', inactive: 'Inactive' },

  actions: {
    activer: 'Activate', desactiver: 'Deactivate', modifier: 'Edit', supprimer: 'Delete',
    annuler: 'Cancel', creer: 'Create', enregistrer: 'Save',
  },

  champs: {
    nom: 'Phase name',
    description: 'Description',
    ordre: 'Display order',
    ordreAide: 'Construction order: pre-partition work before handover.',
    statut: 'Status',
  },

  modal: { nouvelle: 'New phase', modifier: 'Edit “{{nom}}”' },

  supprimer: {
    titre: 'Delete “{{nom}}”?',
    texte: 'If snags use it, deletion will be refused: deactivate it instead.',
  },

  validation: { nomRequis: 'The phase name is required.' },

  messages: {
    creee: 'Phase created.',
    modifiee: 'Phase updated.',
    supprimee: 'Phase deleted.',
    activee: 'Phase activated.',
    desactivee: 'Phase deactivated.',
    creationImpossible: 'Cannot create',
    modificationImpossible: 'Cannot save changes',
    suppressionImpossible: 'Cannot delete',
    actionImpossible: 'Action failed',
  },

  vide: { titre: 'No phase', message: 'Add the phases used on your projects.' },

  selecteur: {
    label: 'Phase',
    choisir: '— Pick a phase —',
    chargement: 'Loading…',
    requise: 'Please select a phase.',
    erreur: 'Could not load the phases.',
    reessayer: 'Retry',
  },
};
