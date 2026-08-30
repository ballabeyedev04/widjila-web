/**
 * Corps d'état — catalogue des métiers / types de travaux du BTP.
 *
 * Namespace découvert automatiquement par `import.meta.glob` (voir
 * src/i18n/index.js) : le nom du fichier devient le nom du namespace.
 */
export default {
  fr: {
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
  },

  en: {
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
  },

  de: {
    titre: 'Gewerke',
    sousTitre: '{{count}} Gewerk(e) im Katalog',
    nouveau: 'Neues Gewerk',
    rechercher: 'Gewerk suchen…',
    chargement: 'Katalog wird geladen…',
    accesRefuse: 'Zugriff verweigert',
    verrouille: 'Standardkatalog',

    filtres: {
      tous: 'Alle Status',
      actifs: 'Nur aktive',
      inactifs: 'Nur inaktive',
    },

    colonnes: {
      metier: 'Gewerk',
      code: 'Code',
      portee: 'Geltungsbereich',
      ordre: 'Reihenfolge',
      statut: 'Status',
    },

    portee: {
      standard: 'Standard',
      organisation: 'Meine Organisation',
    },

    statut: {
      actif: 'Aktiv',
      inactif: 'Inaktiv',
    },

    actions: {
      fermer: 'Schließen',
      activer: 'Aktivieren',
      desactiver: 'Deaktivieren',
      modifier: 'Bearbeiten',
      supprimer: 'Löschen',
      annuler: 'Abbrechen',
      creer: 'Erstellen',
      enregistrer: 'Speichern',
    },

    champs: {
      nom: 'Name des Gewerks',
      code: 'Code',
      codeAide: 'Technischer Schlüssel, Kleinbuchstaben ohne Akzente. Im Zweifel leer lassen.',
      description: 'Beschreibung',
      ordre: 'Anzeigereihenfolge',
      ordreAide: 'Bauablauf: Rohbau vor Ausbau.',
      statut: 'Status',
    },

    modal: {
      nouveau: 'Neues Gewerk',
      modifier: '„{{nom}}“ bearbeiten',
    },

    supprimer: {
      titre: '„{{nom}}“ löschen?',
      texte: 'Wird es von Mängeln verwendet, wird das Löschen abgelehnt: deaktivieren Sie es stattdessen.',
    },

    validation: {
      nomRequis: 'Der Name des Gewerks ist erforderlich.',
    },

    messages: {
      cree: 'Gewerk erstellt.',
      modifie: 'Gewerk geändert.',
      supprime: 'Gewerk gelöscht.',
      active: 'Gewerk aktiviert.',
      desactive: 'Gewerk deaktiviert.',
      creationImpossible: 'Erstellen nicht möglich',
      modificationImpossible: 'Änderung nicht möglich',
      suppressionImpossible: 'Löschen nicht möglich',
      actionImpossible: 'Aktion fehlgeschlagen',
    },

    vide: {
      titre: 'Kein Gewerk',
      message: 'Fügen Sie die Gewerke und Arbeitsarten Ihrer Baustellen hinzu.',
    },

    // Écran d'historique des réserves d'un métier, filtrable par phase.
    historique: {
      titre: 'Verlauf — {{nom}}',
      toutesPhases: 'Alle Phasen',
      sansPhase: 'Ohne Phase',
      creeLe: 'Erstellt am',
      corrigeeLe: 'Behoben am',
      videTitre: 'Kein Mangel',
      videMessage: 'Diesem Gewerk ist kein Mangel zugeordnet.',
      voir: 'Verlauf anzeigen',
    },

    selecteur: {
      label: 'Gewerk',
      aucun: '— Keines —',
      chargement: 'Wird geladen…',
    },
  },

  es: {
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
  },
};
