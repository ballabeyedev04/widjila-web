/** Namespace `enums` — libellés des énumérations métier (statuts, rôles, types). */
export default {
  fr: {
    // Rôles
    Admin: 'Administrateur',
    ChefProjet: 'Chef de projet',
    ConducteurTravaux: 'Conducteur de travaux',
    BureauControle: 'Bureau de contrôle',
    Entreprise: 'Entreprise',
    Client: 'Client',
    MaitreOuvrage: "Maître d'ouvrage",
    MaitreOeuvre: "Maître d'œuvre",

    // Statuts de chantier
    en_preparation: 'En préparation',
    en_cours: 'En cours',
    en_pause: 'En pause',
    archive: 'Archivé',
    cloture: 'Clôturé',

    // Statuts de réserve
    creee: 'Créée',
    affectee: 'Affectée',
    corrigee: 'Corrigée',
    a_verifier: 'À vérifier',
    validee: 'Validée',
    refusee: 'Refusée',
    rouverte: 'Rouverte',
    en_retard: 'En retard',
    cloturee: 'Clôturée',

    // Sévérités
    faible: 'Faible',
    moyenne: 'Moyenne',
    haute: 'Haute',
    critique: 'Critique',

    // Catégories de réserve
    maconnerie: 'Maçonnerie',
    gros_oeuvre: 'Gros œuvre',
    plomberie: 'Plomberie',
    electricite: 'Électricité',
    carrelage: 'Carrelage',
    peinture: 'Peinture',
    menuiserie: 'Menuiserie',
    etancheite: 'Étanchéité',
    isolation: 'Isolation',
    autre: 'Autre',

    // Statuts d'inspection
    planifiee: 'Planifiée',
    terminee: 'Terminée',
    signee: 'Signée',

    // Types d'inspection
    inspection: 'Inspection',
    opr: 'OPR',
    visite_contradictoire: 'Visite contradictoire',

    // Statuts de convocation
    invite: 'Invité',
    accepte: 'Accepté',
    decline: 'Décliné',
    present: 'Présent',
    absent: 'Absent',

    // Statuts d'utilisateur
    actif: 'Actif',
    inactif: 'Inactif',
    en_attente_validation: 'En attente',

    // Types de document
    plan: 'Plan',
    contrat: 'Contrat',
    doe: 'DOE',
    pv: 'PV',
    compte_rendu: 'Compte rendu',
    rapport: 'Rapport',
    notice: 'Notice',
    photo: 'Photo',

    // Types de partenaire
    client: 'Client',
    maitre_ouvrage: "Maître d'ouvrage",
    maitre_oeuvre: "Maître d'œuvre",
    sous_traitant: 'Sous-traitant',
    fournisseur: 'Fournisseur',
    bureau_controle: 'Bureau de contrôle',

    // Abonnements
    Starter: 'Starter',
    Pro: 'Pro',
    Business: 'Business',
    Enterprise: 'Enterprise',
  },

  en: {
    // Roles
    Admin: 'Administrator',
    ChefProjet: 'Project manager',
    ConducteurTravaux: 'Site manager',
    BureauControle: 'Inspection body',
    Entreprise: 'Contractor',
    Client: 'Client',
    MaitreOuvrage: 'Project owner',
    MaitreOeuvre: 'Project supervisor',

    // Site statuses
    en_preparation: 'In preparation',
    en_cours: 'In progress',
    en_pause: 'On hold',
    archive: 'Archived',
    cloture: 'Closed',

    // Snag statuses
    creee: 'Created',
    affectee: 'Assigned',
    corrigee: 'Corrected',
    a_verifier: 'To be checked',
    validee: 'Approved',
    refusee: 'Rejected',
    rouverte: 'Reopened',
    en_retard: 'Overdue',
    cloturee: 'Closed',

    // Severities
    faible: 'Low',
    moyenne: 'Medium',
    haute: 'High',
    critique: 'Critical',

    // Snag categories
    maconnerie: 'Masonry',
    gros_oeuvre: 'Structural works',
    plomberie: 'Plumbing',
    electricite: 'Electrical works',
    carrelage: 'Tiling',
    peinture: 'Painting',
    menuiserie: 'Joinery',
    etancheite: 'Waterproofing',
    isolation: 'Insulation',
    autre: 'Other',

    // Inspection statuses
    planifiee: 'Scheduled',
    terminee: 'Completed',
    signee: 'Signed',

    // Inspection types
    inspection: 'Inspection',
    opr: 'OPR',
    visite_contradictoire: 'Joint site visit',

    // Attendance statuses
    invite: 'Invited',
    accepte: 'Accepted',
    decline: 'Declined',
    present: 'Present',
    absent: 'Absent',

    // User statuses
    actif: 'Active',
    inactif: 'Inactive',
    en_attente_validation: 'Pending',

    // Document types
    plan: 'Drawing',
    contrat: 'Contract',
    doe: 'DOE',
    pv: 'Minutes',
    compte_rendu: 'Site report',
    rapport: 'Report',
    notice: 'Instructions',
    photo: 'Photo',

    // Partner types
    client: 'Client',
    maitre_ouvrage: 'Project owner',
    maitre_oeuvre: 'Project supervisor',
    sous_traitant: 'Subcontractor',
    fournisseur: 'Supplier',
    bureau_controle: 'Inspection body',

    // Subscription plans
    Starter: 'Starter',
    Pro: 'Pro',
    Business: 'Business',
    Enterprise: 'Enterprise',
  },

  de: {
    // Rollen
    Admin: 'Administrator',
    ChefProjet: 'Projektleiter',
    ConducteurTravaux: 'Bauleiter',
    BureauControle: 'Prüfstelle',
    Entreprise: 'Bauunternehmen',
    Client: 'Kunde',
    MaitreOuvrage: 'Bauherr',
    MaitreOeuvre: 'Planer',

    // Baustellenstatus
    en_preparation: 'In Vorbereitung',
    en_cours: 'In Bearbeitung',
    en_pause: 'Pausiert',
    archive: 'Archiviert',
    cloture: 'Abgeschlossen',

    // Mängelstatus
    creee: 'Erstellt',
    affectee: 'Zugewiesen',
    corrigee: 'Behoben',
    a_verifier: 'Zu prüfen',
    validee: 'Freigegeben',
    refusee: 'Abgelehnt',
    rouverte: 'Wiedereröffnet',
    en_retard: 'Überfällig',
    cloturee: 'Geschlossen',

    // Schweregrade
    faible: 'Niedrig',
    moyenne: 'Mittel',
    haute: 'Hoch',
    critique: 'Kritisch',

    // Mängelkategorien
    maconnerie: 'Mauerwerk',
    gros_oeuvre: 'Rohbau',
    plomberie: 'Sanitär',
    electricite: 'Elektrik',
    carrelage: 'Fliesenarbeiten',
    peinture: 'Malerarbeiten',
    menuiserie: 'Schreinerarbeiten',
    etancheite: 'Abdichtung',
    isolation: 'Dämmung',
    autre: 'Sonstiges',

    // Begehungsstatus
    planifiee: 'Geplant',
    terminee: 'Beendet',
    signee: 'Unterzeichnet',

    // Begehungsarten
    inspection: 'Inspektion',
    opr: 'OPR',
    visite_contradictoire: 'Gemeinsame Begehung',

    // Teilnahmestatus
    invite: 'Eingeladen',
    accepte: 'Angenommen',
    decline: 'Abgesagt',
    present: 'Anwesend',
    absent: 'Abwesend',

    // Benutzerstatus
    actif: 'Aktiv',
    inactif: 'Inaktiv',
    en_attente_validation: 'Ausstehend',

    // Dokumentarten
    plan: 'Plan',
    contrat: 'Vertrag',
    doe: 'DOE',
    pv: 'Protokoll',
    compte_rendu: 'Baubericht',
    rapport: 'Bericht',
    notice: 'Anleitung',
    photo: 'Foto',

    // Partnerarten
    client: 'Kunde',
    maitre_ouvrage: 'Bauherr',
    maitre_oeuvre: 'Planer',
    sous_traitant: 'Subunternehmer',
    fournisseur: 'Lieferant',
    bureau_controle: 'Prüfstelle',

    // Abonnements
    Starter: 'Starter',
    Pro: 'Pro',
    Business: 'Business',
    Enterprise: 'Enterprise',
  },

  es: {
    // Roles
    Admin: 'Administrador',
    ChefProjet: 'Jefe de proyecto',
    ConducteurTravaux: 'Jefe de obra',
    BureauControle: 'Organismo de control',
    Entreprise: 'Empresa',
    Client: 'Cliente',
    MaitreOuvrage: 'Promotor',
    MaitreOeuvre: 'Dirección facultativa',

    // Estados de obra
    en_preparation: 'En preparación',
    en_cours: 'En curso',
    en_pause: 'En pausa',
    archive: 'Archivado',
    cloture: 'Cerrado',

    // Estados de reserva
    creee: 'Creada',
    affectee: 'Asignada',
    corrigee: 'Corregida',
    a_verifier: 'Por verificar',
    validee: 'Validada',
    refusee: 'Rechazada',
    rouverte: 'Reabierta',
    en_retard: 'Retrasada',
    cloturee: 'Cerrada',

    // Severidades
    faible: 'Baja',
    moyenne: 'Media',
    haute: 'Alta',
    critique: 'Crítica',

    // Categorías de reserva
    maconnerie: 'Albañilería',
    gros_oeuvre: 'Obra gruesa',
    plomberie: 'Fontanería',
    electricite: 'Electricidad',
    carrelage: 'Alicatado',
    peinture: 'Pintura',
    menuiserie: 'Carpintería',
    etancheite: 'Impermeabilización',
    isolation: 'Aislamiento',
    autre: 'Otro',

    // Estados de inspección
    planifiee: 'Planificada',
    terminee: 'Finalizada',
    signee: 'Firmada',

    // Tipos de inspección
    inspection: 'Inspección',
    opr: 'OPR',
    visite_contradictoire: 'Visita contradictoria',

    // Estados de convocatoria
    invite: 'Invitado',
    accepte: 'Aceptado',
    decline: 'Rechazado',
    present: 'Presente',
    absent: 'Ausente',

    // Estados de usuario
    actif: 'Activo',
    inactif: 'Inactivo',
    en_attente_validation: 'Pendiente',

    // Tipos de documento
    plan: 'Plano',
    contrat: 'Contrato',
    doe: 'DOE',
    pv: 'Acta',
    compte_rendu: 'Informe de obra',
    rapport: 'Informe',
    notice: 'Manual',
    photo: 'Foto',

    // Tipos de socio
    client: 'Cliente',
    maitre_ouvrage: 'Promotor',
    maitre_oeuvre: 'Dirección facultativa',
    sous_traitant: 'Subcontratista',
    fournisseur: 'Proveedor',
    bureau_controle: 'Organismo de control',

    // Suscripciones
    Starter: 'Starter',
    Pro: 'Pro',
    Business: 'Business',
    Enterprise: 'Enterprise',
  },
};
