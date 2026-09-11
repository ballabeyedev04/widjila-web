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
 * Langue : FR. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  titre: 'Phases',
  sousTitre: '{{count}} phase(s) au référentiel',
  nouvelle: 'Nouvelle phase',
  rechercher: 'Rechercher une phase…',
  chargement: 'Chargement du référentiel…',
  accesRefuse: 'Accès refusé',
  verrouille: 'Référentiel standard',

  filtres: { toutes: 'Tous les statuts', actives: 'Actives uniquement', inactives: 'Inactives uniquement' },
  colonnes: { ordre: 'Ordre', phase: 'Phase', portee: 'Portée', statut: 'Statut' },
  portee: { standard: 'Standard', organisation: 'Mon organisation' },
  statut: { active: 'Active', inactive: 'Inactive' },

  actions: {
    activer: 'Activer', desactiver: 'Désactiver', modifier: 'Modifier', supprimer: 'Supprimer',
    annuler: 'Annuler', creer: 'Créer', enregistrer: 'Enregistrer',
  },

  champs: {
    nom: 'Nom de la phase',
    description: 'Description',
    ordre: 'Ordre d’affichage',
    ordreAide: 'Ordre du chantier : Pré-cloisons avant Réception.',
    statut: 'Statut',
  },

  modal: { nouvelle: 'Nouvelle phase', modifier: 'Modifier « {{nom}} »' },

  supprimer: {
    titre: 'Supprimer « {{nom}} » ?',
    texte: 'Si des réserves l’utilisent, la suppression sera refusée : désactivez-la plutôt.',
  },

  validation: { nomRequis: 'Le nom de la phase est requis.' },

  messages: {
    creee: 'Phase créée.',
    modifiee: 'Phase modifiée.',
    supprimee: 'Phase supprimée.',
    activee: 'Phase activée.',
    desactivee: 'Phase désactivée.',
    creationImpossible: 'Création impossible',
    modificationImpossible: 'Modification impossible',
    suppressionImpossible: 'Suppression impossible',
    actionImpossible: 'Action impossible',
  },

  vide: { titre: 'Aucune phase', message: 'Ajoutez les phases de vos chantiers.' },

  // Employé par les formulaires de réserve — la phase y est OBLIGATOIRE.
  selecteur: {
    label: 'Phase',
    choisir: '— Choisir une phase —',
    chargement: 'Chargement…',
    requise: 'Veuillez sélectionner une phase.',
    erreur: 'Impossible de charger les phases.',
    reessayer: 'Réessayer',
  },
};
