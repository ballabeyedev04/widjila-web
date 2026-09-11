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
 * Langue : FR. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  document: { titre: 'Types de document' },
  intervenant: { titre: 'Types d’intervenant' },
  inspection: { titre: 'Types d’inspection' },

  sousTitre: '{{count}} type(s) au référentiel',
  nouveau: 'Nouveau type',
  rechercher: 'Rechercher un type…',
  accesRefuse: 'Accès refusé',
  verrouille: 'Référentiel standard',

  filtres: { tous: 'Tous', actifs: 'Actifs', inactifs: 'Inactifs' },
  colonnes: { nom: 'Nom', code: 'Code', portee: 'Portée', ordre: 'Ordre', statut: 'Statut' },
  portee: { standard: 'Standard', organisation: 'Mon entreprise' },
  statut: { actif: 'Actif', inactif: 'Inactif' },

  actions: {
    activer: 'Activer',
    desactiver: 'Désactiver',
    modifier: 'Modifier',
    supprimer: 'Supprimer',
    annuler: 'Annuler',
    enregistrer: 'Enregistrer',
  },

  vide: {
    titre: 'Aucun type',
    message: 'Ajoutez les types propres à votre entreprise. Le référentiel standard reste toujours disponible.',
  },

  modal: {
    titreCreation: 'Nouveau type',
    titreEdition: 'Modifier le type',
  },

  champs: {
    code: 'Code',
    codeAide: 'Clé technique, en minuscules, sans espace ni accent (ex. : ppsps).',
    codeFige: 'Le code ne peut pas être modifié : il est enregistré dans les données existantes.',
    nom: 'Nom affiché',
    description: 'Description',
    ordre: 'Ordre d’affichage',
    ordreAide: 'Les plus petits en premier.',
    statut: 'Statut',
  },

  validation: {
    nomRequis: 'Le nom est obligatoire',
    codeRequis: 'Le code est obligatoire',
    codeFormat: 'Lettres minuscules, chiffres et tirets bas uniquement',
  },

  supprimer: {
    titre: 'Supprimer « {{nom}} » ?',
    texte: 'La suppression est refusée si des enregistrements utilisent ce type. Dans ce cas, désactivez-le : il cessera d’être proposé sans rien changer aux données existantes.',
  },

  messages: {
    cree: 'Type créé',
    modifie: 'Type modifié',
    supprime: 'Type supprimé',
    active: 'Type activé',
    desactive: 'Type désactivé',
    echec: 'Enregistrement impossible',
    actionImpossible: 'Action impossible',
    suppressionImpossible: 'Suppression impossible',
  },
};
