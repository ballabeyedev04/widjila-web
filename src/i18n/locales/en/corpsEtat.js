/**
 * Corps d'état — catalogue des métiers / types de travaux du BTP.
 *
 * Namespace découvert automatiquement par `import.meta.glob` (voir
 * src/i18n/index.js) : le nom du fichier devient le nom du namespace.
 *
 * Langue : EN. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  titre: 'Trades',
  sousTitre: '{{count}} trade(s) in the catalogue',
  nouveau: 'New trade',
  rechercher: 'Search a trade…',
  chargement: 'Loading the catalogue…',
  accesRefuse: 'Access denied',
  verrouille: 'Standard catalogue',

  filtres: {
    tous: 'All statuses',
    actifs: 'Active only',
    inactifs: 'Inactive only',
  },

  colonnes: {
    metier: 'Trade',
    code: 'Code',
    portee: 'Scope',
    ordre: 'Order',
    statut: 'Status',
  },

  portee: {
    standard: 'Standard',
    organisation: 'My organisation',
  },

  statut: {
    actif: 'Active',
    inactif: 'Inactive',
  },

  actions: {
    fermer: 'Close',
    activer: 'Activate',
    desactiver: 'Deactivate',
    modifier: 'Edit',
    supprimer: 'Delete',
    annuler: 'Cancel',
    creer: 'Create',
    enregistrer: 'Save',
  },

  champs: {
    nom: 'Trade name',
    code: 'Code',
    codeAide: 'Technical key, lowercase without accents. Leave empty if unsure.',
    description: 'Description',
    ordre: 'Display order',
    ordreAide: 'Construction order: structural work before finishes.',
    statut: 'Status',
  },

  modal: {
    nouveau: 'New trade',
    modifier: 'Edit “{{nom}}”',
  },

  supprimer: {
    titre: 'Delete “{{nom}}”?',
    texte: 'If snags use it, deletion will be refused: deactivate it instead.',
  },

  validation: {
    nomRequis: 'The trade name is required.',
  },

  messages: {
    cree: 'Trade created.',
    modifie: 'Trade updated.',
    supprime: 'Trade deleted.',
    active: 'Trade activated.',
    desactive: 'Trade deactivated.',
    creationImpossible: 'Cannot create',
    modificationImpossible: 'Cannot save changes',
    suppressionImpossible: 'Cannot delete',
    actionImpossible: 'Action failed',
  },

  vide: {
    titre: 'No trade',
    message: 'Add the trades and work types used on your projects.',
  },

  // Écran d'historique des réserves d'un métier, filtrable par phase.
  historique: {
    titre: 'History — {{nom}}',
    toutesPhases: 'All phases',
    sansPhase: 'No phase',
    creeLe: 'Created on',
    corrigeeLe: 'Fixed on',
    videTitre: 'No snag',
    videMessage: 'No snag is linked to this trade.',
    voir: 'View history',
  },

  selecteur: {
    label: 'Trade',
    aucun: '— None —',
    chargement: 'Loading…',
  },
};
