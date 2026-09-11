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
 * Langue : ES. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
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
};
