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
 * Langue : ES. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  document: { titre: 'Tipos de documento' },
  intervenant: { titre: 'Tipos de interviniente' },
  inspection: { titre: 'Tipos de inspección' },

  sousTitre: '{{count}} tipo(s) en el catálogo',
  nouveau: 'Nuevo tipo',
  rechercher: 'Buscar un tipo…',
  accesRefuse: 'Acceso denegado',
  verrouille: 'Catálogo estándar',

  filtres: { tous: 'Todos', actifs: 'Activos', inactifs: 'Inactivos' },
  colonnes: { nom: 'Nombre', code: 'Código', portee: 'Alcance', ordre: 'Orden', statut: 'Estado' },
  portee: { standard: 'Estándar', organisation: 'Mi empresa' },
  statut: { actif: 'Activo', inactif: 'Inactivo' },

  actions: {
    activer: 'Activar',
    desactiver: 'Desactivar',
    modifier: 'Editar',
    supprimer: 'Eliminar',
    annuler: 'Cancelar',
    enregistrer: 'Guardar',
  },

  vide: {
    titre: 'Sin tipos',
    message: 'Añada los tipos propios de su empresa. El catálogo estándar siempre está disponible.',
  },

  modal: {
    titreCreation: 'Nuevo tipo',
    titreEdition: 'Editar tipo',
  },

  champs: {
    code: 'Código',
    codeAide: 'Clave técnica, en minúsculas, sin espacios ni acentos (p. ej. ppsps).',
    codeFige: 'El código no se puede modificar: está guardado en los datos existentes.',
    nom: 'Nombre mostrado',
    description: 'Descripción',
    ordre: 'Orden de visualización',
    ordreAide: 'Los más pequeños primero.',
    statut: 'Estado',
  },

  validation: {
    nomRequis: 'El nombre es obligatorio',
    codeRequis: 'El código es obligatorio',
    codeFormat: 'Solo letras minúsculas, cifras y guiones bajos',
  },

  supprimer: {
    titre: '¿Eliminar «{{nom}}»?',
    texte: 'La eliminación se rechaza si hay registros que usan este tipo. En ese caso, desactívelo: dejará de proponerse sin cambiar nada en los datos existentes.',
  },

  messages: {
    cree: 'Tipo creado',
    modifie: 'Tipo modificado',
    supprime: 'Tipo eliminado',
    active: 'Tipo activado',
    desactive: 'Tipo desactivado',
    echec: 'No se pudo guardar',
    actionImpossible: 'Acción imposible',
    suppressionImpossible: 'No se pudo eliminar',
  },
};
