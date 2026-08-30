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
 */
export default {
  fr: {
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
  },

  en: {
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
  },

  de: {
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
  },

  es: {
    titre: 'Fases',
    sousTitre: '{{count}} fase(s) en el catálogo',
    nouvelle: 'Nueva fase',
    rechercher: 'Buscar una fase…',
    chargement: 'Cargando el catálogo…',
    accesRefuse: 'Acceso denegado',
    verrouille: 'Catálogo estándar',

    filtres: { toutes: 'Todos los estados', actives: 'Solo activas', inactives: 'Solo inactivas' },
    colonnes: { ordre: 'Orden', phase: 'Fase', portee: 'Alcance', statut: 'Estado' },
    portee: { standard: 'Estándar', organisation: 'Mi organización' },
    statut: { active: 'Activa', inactive: 'Inactiva' },

    actions: {
      activer: 'Activar', desactiver: 'Desactivar', modifier: 'Editar', supprimer: 'Eliminar',
      annuler: 'Cancelar', creer: 'Crear', enregistrer: 'Guardar',
    },

    champs: {
      nom: 'Nombre de la fase',
      description: 'Descripción',
      ordre: 'Orden de visualización',
      ordreAide: 'Orden de obra: pretabiques antes que la recepción.',
      statut: 'Estado',
    },

    modal: { nouvelle: 'Nueva fase', modifier: 'Editar «{{nom}}»' },

    supprimer: {
      titre: '¿Eliminar «{{nom}}»?',
      texte: 'Si hay reservas que la usan, se rechazará la eliminación: desactívela en su lugar.',
    },

    validation: { nomRequis: 'El nombre de la fase es obligatorio.' },

    messages: {
      creee: 'Fase creada.',
      modifiee: 'Fase modificada.',
      supprimee: 'Fase eliminada.',
      activee: 'Fase activada.',
      desactivee: 'Fase desactivada.',
      creationImpossible: 'No se pudo crear',
      modificationImpossible: 'No se pudo modificar',
      suppressionImpossible: 'No se puede eliminar',
      actionImpossible: 'Acción fallida',
    },

    vide: { titre: 'Ninguna fase', message: 'Añada las fases de sus obras.' },

    selecteur: {
      label: 'Fase',
      choisir: '— Elegir una fase —',
      chargement: 'Cargando…',
      requise: 'Seleccione una fase.',
      erreur: 'No se pudieron cargar las fases.',
      reessayer: 'Reintentar',
    },
  },
};
