/**
 * Référentiels de TYPE administrables — documents, intervenants, inspections.
 *
 * Un seul namespace pour les trois écrans : ils partagent le même composant
 * (`pages/referentiel/ReferentielTypes.jsx`) et ne diffèrent que par leur
 * titre. Trois namespaces auraient triplé les mêmes libellés.
 *
 * Namespace découvert automatiquement par `import.meta.glob` (voir
 * src/i18n/index.js) : le nom du fichier devient le nom du namespace.
 */
export default {
  fr: {
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
  },

  en: {
    document: { titre: 'Document types' },
    intervenant: { titre: 'Stakeholder types' },
    inspection: { titre: 'Inspection types' },

    sousTitre: '{{count}} type(s) in the list',
    nouveau: 'New type',
    rechercher: 'Search for a type…',
    accesRefuse: 'Access denied',
    verrouille: 'Standard list',

    filtres: { tous: 'All', actifs: 'Active', inactifs: 'Inactive' },
    colonnes: { nom: 'Name', code: 'Code', portee: 'Scope', ordre: 'Order', statut: 'Status' },
    portee: { standard: 'Standard', organisation: 'My company' },
    statut: { actif: 'Active', inactif: 'Inactive' },

    actions: {
      activer: 'Activate',
      desactiver: 'Deactivate',
      modifier: 'Edit',
      supprimer: 'Delete',
      annuler: 'Cancel',
      enregistrer: 'Save',
    },

    vide: {
      titre: 'No types',
      message: 'Add the types your company needs. The standard list always remains available.',
    },

    modal: {
      titreCreation: 'New type',
      titreEdition: 'Edit type',
    },

    champs: {
      code: 'Code',
      codeAide: 'Technical key, lowercase, no spaces or accents (e.g. ppsps).',
      codeFige: 'The code cannot be changed: it is stored in existing records.',
      nom: 'Display name',
      description: 'Description',
      ordre: 'Display order',
      ordreAide: 'Lowest first.',
      statut: 'Status',
    },

    validation: {
      nomRequis: 'Name is required',
      codeRequis: 'Code is required',
      codeFormat: 'Lowercase letters, digits and underscores only',
    },

    supprimer: {
      titre: 'Delete “{{nom}}”?',
      texte: 'Deletion is refused if records use this type. In that case, deactivate it: it will no longer be offered, and existing records stay unchanged.',
    },

    messages: {
      cree: 'Type created',
      modifie: 'Type updated',
      supprime: 'Type deleted',
      active: 'Type activated',
      desactive: 'Type deactivated',
      echec: 'Could not save',
      actionImpossible: 'Action failed',
      suppressionImpossible: 'Could not delete',
    },
  },

  de: {
    document: { titre: 'Dokumenttypen' },
    intervenant: { titre: 'Beteiligtentypen' },
    inspection: { titre: 'Prüfungstypen' },

    sousTitre: '{{count}} Typ(en) im Verzeichnis',
    nouveau: 'Neuer Typ',
    rechercher: 'Typ suchen…',
    accesRefuse: 'Zugriff verweigert',
    verrouille: 'Standardverzeichnis',

    filtres: { tous: 'Alle', actifs: 'Aktiv', inactifs: 'Inaktiv' },
    colonnes: { nom: 'Name', code: 'Code', portee: 'Geltungsbereich', ordre: 'Reihenfolge', statut: 'Status' },
    portee: { standard: 'Standard', organisation: 'Mein Unternehmen' },
    statut: { actif: 'Aktiv', inactif: 'Inaktiv' },

    actions: {
      activer: 'Aktivieren',
      desactiver: 'Deaktivieren',
      modifier: 'Bearbeiten',
      supprimer: 'Löschen',
      annuler: 'Abbrechen',
      enregistrer: 'Speichern',
    },

    vide: {
      titre: 'Keine Typen',
      message: 'Fügen Sie die Typen Ihres Unternehmens hinzu. Das Standardverzeichnis bleibt immer verfügbar.',
    },

    modal: {
      titreCreation: 'Neuer Typ',
      titreEdition: 'Typ bearbeiten',
    },

    champs: {
      code: 'Code',
      codeAide: 'Technischer Schlüssel, Kleinbuchstaben, ohne Leerzeichen oder Akzente (z. B. ppsps).',
      codeFige: 'Der Code kann nicht geändert werden: Er ist in bestehenden Daten gespeichert.',
      nom: 'Anzeigename',
      description: 'Beschreibung',
      ordre: 'Anzeigereihenfolge',
      ordreAide: 'Kleinste zuerst.',
      statut: 'Status',
    },

    validation: {
      nomRequis: 'Name ist erforderlich',
      codeRequis: 'Code ist erforderlich',
      codeFormat: 'Nur Kleinbuchstaben, Ziffern und Unterstriche',
    },

    supprimer: {
      titre: '„{{nom}}“ löschen?',
      texte: 'Das Löschen wird abgelehnt, wenn Datensätze diesen Typ verwenden. Deaktivieren Sie ihn in diesem Fall: Er wird nicht mehr angeboten, bestehende Datensätze bleiben unverändert.',
    },

    messages: {
      cree: 'Typ erstellt',
      modifie: 'Typ geändert',
      supprime: 'Typ gelöscht',
      active: 'Typ aktiviert',
      desactive: 'Typ deaktiviert',
      echec: 'Speichern fehlgeschlagen',
      actionImpossible: 'Aktion fehlgeschlagen',
      suppressionImpossible: 'Löschen fehlgeschlagen',
    },
  },

  es: {
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
  },
};
