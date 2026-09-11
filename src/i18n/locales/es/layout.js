/**
 * Namespace `layout` — navigation, mise en page et composants partagés.
 *
 * Couvre AdminLayout (barre latérale, barre supérieure, déconnexion) et les
 * composants transverses : Spinner, EmptyState, Modal, Pagination,
 * AccessDenied, FormControls, ErrorBoundary, MesChantiersCard, StatCard.
 *
 * Les chaînes réellement génériques (actions, états, champs, messages) restent
 * dans `common`, disponible ici par repli automatique : depuis ce namespace,
 * t('actions.fermer') résout sur common.actions.fermer.
 *
 * Langue : ES. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  actions: {
    rafraichir: 'Actualizar la lista',
  },
  tableau: {
    tronque: '{{affiches}} de {{total}} elementos mostrados. Afine la búsqueda para ver los demás.',
  },
  sidebar: {
    espaceAdmin: 'Área de administración',
    groupePilotage: 'Gestión',
    groupePlateforme: 'Plataforma',
    ouvrirMenu: 'Abrir el menú',
    allerAuContenu: 'Ir al contenido',
    basculerMenu: 'Contraer / expandir el menú',
  },
  reseau: {
    horsLigneTitre: 'Está sin conexión.',
    horsLigneTexte: 'Sus datos solo se enviarán cuando vuelva la red — no los repita.',
  },
  nav: {
    tableauBordChantier: 'Panel de la obra',
    documents: 'Documentos',
    abonnement: 'Suscripción',
    prixAbonnements: 'Precios de suscripción',
    phases: 'Fases',
    corpsEtat: 'Oficios',
    typesDocument: 'Tipos de documento',
    typesIntervenant: 'Tipos de interviniente',
    typesInspection: 'Tipos de inspección',
    tableauDeBord: 'Panel de control',
    chantiers: 'Obras',
    demandesChantier: 'Solicitudes de obra',
    depotPlans: 'Envío de planos',
    toutesReserves: 'Todas las reservas',
    tousPlans: 'Todos los planos',
    membres: 'Miembros',
    equipes: 'Equipos',
    partenaires: 'Socios',
    organisation: 'Organización',
    notifications: 'Notificaciones',
    monProfil: 'Mi perfil',
    vuePlateforme: 'Vista de plataforma',
    utilisateurs: 'Usuarios',
    organisations: 'Organizaciones',
    demandesInscription: 'Solicitudes de registro',
    demandesSuppression: 'Solicitudes de eliminación',
    journalAudit: 'Registro de auditoría',
  },
  topbar: {
    titreParDefaut: 'Suivie Chantier',
    nouvelleReserve: 'Nueva reserva',
    notifications: 'Notificaciones',
    abonnementActif: 'Suscripción activa',
    planActif: 'Activo',
    essaiRestant: 'Prueba gratuita — queda {{count}} día',
    essaiRestant_other: 'Prueba gratuita — quedan {{count}} días',
    essaiCourt: 'Prueba: {{jours}} d',
    essaiExpire: 'Prueba caducada',
    essaiExpireTitre: 'Prueba caducada — suscríbase a un plan',
  },
  deconnexion: {
    titre: 'Cerrar sesión',
    confirmation: '¿Seguro que quiere cerrar sesión?',
    succes: 'Ha cerrado la sesión.',
  },
  vide: {
    message: 'No hay nada que mostrar por el momento.',
  },
  accesRefuse: {
    ressource: 'No tiene permisos para acceder a este recurso.',
  },
  erreur: {
    titre: 'Se ha producido un error',
    inattendue: 'Error inesperado',
    reessayer: 'Reintentar',
  },
  formulaire: {
    selectionner: '— Seleccionar —',
    rechercher: 'Buscar…',
    aucunResultat: 'Sin resultados',
  },
  pagination: {
    intervalle: '{{from}}–{{to}} de {{total}}',
  },
  mesChantiers: {
    titre: 'Mis obras',
    affectations: 'Asignaciones en {{count}} proyecto',
    affectations_other: 'Asignaciones en {{count}} proyectos',
    erreurChargement: 'No se han podido cargar sus obras',
    aucunTitre: 'Ninguna obra asignada',
    aucunMessage: 'Un administrador puede asignarle obras para que aparezcan aquí.',
    affecte: 'Asignado',
    ouvrir: 'Abrir',
  },
};
