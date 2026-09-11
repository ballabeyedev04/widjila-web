/**
 * Corps d'état — catalogue des métiers / types de travaux du BTP.
 *
 * Namespace découvert automatiquement par `import.meta.glob` (voir
 * src/i18n/index.js) : le nom du fichier devient le nom du namespace.
 *
 * Langue : ES. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  titre: 'Oficios',
  sousTitre: '{{count}} oficio(s) en el catálogo',
  nouveau: 'Nuevo oficio',
  rechercher: 'Buscar un oficio…',
  chargement: 'Cargando el catálogo…',
  accesRefuse: 'Acceso denegado',
  verrouille: 'Catálogo estándar',

  filtres: {
    tous: 'Todos los estados',
    actifs: 'Solo activos',
    inactifs: 'Solo inactivos',
  },

  colonnes: {
    metier: 'Oficio',
    code: 'Código',
    portee: 'Alcance',
    ordre: 'Orden',
    statut: 'Estado',
  },

  portee: {
    standard: 'Estándar',
    organisation: 'Mi organización',
  },

  statut: {
    actif: 'Activo',
    inactif: 'Inactivo',
  },

  actions: {
    fermer: 'Cerrar',
    activer: 'Activar',
    desactiver: 'Desactivar',
    modifier: 'Editar',
    supprimer: 'Eliminar',
    annuler: 'Cancelar',
    creer: 'Crear',
    enregistrer: 'Guardar',
  },

  champs: {
    nom: 'Nombre del oficio',
    code: 'Código',
    codeAide: 'Clave técnica, en minúsculas y sin acentos. Déjelo vacío si duda.',
    description: 'Descripción',
    ordre: 'Orden de visualización',
    ordreAide: 'Orden de obra: estructura antes que acabados.',
    statut: 'Estado',
  },

  modal: {
    nouveau: 'Nuevo oficio',
    modifier: 'Editar «{{nom}}»',
  },

  supprimer: {
    titre: '¿Eliminar «{{nom}}»?',
    texte: 'Si hay reservas que lo usan, se rechazará la eliminación: desactívelo en su lugar.',
  },

  validation: {
    nomRequis: 'El nombre del oficio es obligatorio.',
  },

  messages: {
    cree: 'Oficio creado.',
    modifie: 'Oficio modificado.',
    supprime: 'Oficio eliminado.',
    active: 'Oficio activado.',
    desactive: 'Oficio desactivado.',
    creationImpossible: 'No se pudo crear',
    modificationImpossible: 'No se pudo modificar',
    suppressionImpossible: 'No se puede eliminar',
    actionImpossible: 'Acción fallida',
  },

  vide: {
    titre: 'Ningún oficio',
    message: 'Añada los oficios y tipos de trabajo de sus obras.',
  },

  // Écran d'historique des réserves d'un métier, filtrable par phase.
  historique: {
    titre: 'Historial — {{nom}}',
    toutesPhases: 'Todas las fases',
    sansPhase: 'Sin fase',
    creeLe: 'Creada el',
    corrigeeLe: 'Corregida el',
    videTitre: 'Ninguna reserva',
    videMessage: 'Ninguna reserva está vinculada a este oficio.',
    voir: 'Ver el historial',
  },

  selecteur: {
    label: 'Oficio',
    aucun: '— Ninguno —',
    chargement: 'Cargando…',
  },
};
