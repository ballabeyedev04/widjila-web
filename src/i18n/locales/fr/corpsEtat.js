/**
 * Corps d'état — catalogue des métiers / types de travaux du BTP.
 *
 * Namespace découvert automatiquement par `import.meta.glob` (voir
 * src/i18n/index.js) : le nom du fichier devient le nom du namespace.
 *
 * Langue : FR. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  titre: 'Corps d’état',
  sousTitre: '{{count}} métier(s) au catalogue',
  nouveau: 'Nouveau corps d’état',
  rechercher: 'Rechercher un métier…',
  chargement: 'Chargement du catalogue…',
  accesRefuse: 'Accès refusé',
  verrouille: 'Catalogue standard',

  filtres: {
    tous: 'Tous les statuts',
    actifs: 'Actifs uniquement',
    inactifs: 'Inactifs uniquement',
  },

  colonnes: {
    metier: 'Métier',
    code: 'Code',
    portee: 'Portée',
    ordre: 'Ordre',
    statut: 'Statut',
  },

  portee: {
    standard: 'Standard',
    organisation: 'Mon organisation',
  },

  statut: {
    actif: 'Actif',
    inactif: 'Inactif',
  },

  actions: {
    fermer: 'Fermer',
    activer: 'Activer',
    desactiver: 'Désactiver',
    modifier: 'Modifier',
    supprimer: 'Supprimer',
    annuler: 'Annuler',
    creer: 'Créer',
    enregistrer: 'Enregistrer',
  },

  champs: {
    nom: 'Nom du métier',
    code: 'Code',
    codeAide: 'Clé technique, en minuscules sans accent. Laissez vide si vous hésitez.',
    description: 'Description',
    ordre: 'Ordre d’affichage',
    ordreAide: 'Ordre du chantier : gros œuvre avant finitions.',
    statut: 'Statut',
  },

  modal: {
    nouveau: 'Nouveau corps d’état',
    modifier: 'Modifier « {{nom}} »',
  },

  supprimer: {
    titre: 'Supprimer « {{nom}} » ?',
    texte: 'Si des réserves l’utilisent, la suppression sera refusée : désactivez-le plutôt.',
  },

  validation: {
    nomRequis: 'Le nom du métier est requis.',
  },

  messages: {
    cree: 'Corps d’état créé.',
    modifie: 'Corps d’état modifié.',
    supprime: 'Corps d’état supprimé.',
    active: 'Corps d’état activé.',
    desactive: 'Corps d’état désactivé.',
    creationImpossible: 'Création impossible',
    modificationImpossible: 'Modification impossible',
    suppressionImpossible: 'Suppression impossible',
    actionImpossible: 'Action impossible',
  },

  vide: {
    titre: 'Aucun corps d’état',
    message: 'Ajoutez les métiers et types de travaux de vos chantiers.',
  },

  // Écran d'historique des réserves d'un métier, filtrable par phase.
  historique: {
    titre: 'Historique — {{nom}}',
    toutesPhases: 'Toutes les phases',
    sansPhase: 'Sans phase',
    creeLe: 'Créée le',
    corrigeeLe: 'Corrigée le',
    videTitre: 'Aucune réserve',
    videMessage: 'Aucune réserve n’est rattachée à ce métier.',
    voir: 'Voir l’historique',
  },

  // Employé par les formulaires de réserve (liste déroulante).
  selecteur: {
    label: 'Corps d’état',
    aucun: '— Aucun —',
    chargement: 'Chargement…',
  },
};
