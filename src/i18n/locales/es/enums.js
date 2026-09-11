/** Namespace `enums` — libellés des énumérations métier (statuts, rôles, types). *
 * Langue : ES. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  // Roles
  Admin: 'Administrador',
  ChefProjet: 'Jefe de proyecto',
  ConducteurTravaux: 'Jefe de obra',
  BureauControle: 'Organismo de control',
  Entreprise: 'Empresa',
  Client: 'Cliente',
  MaitreOuvrage: 'Promotor',
  MaitreOeuvre: 'Dirección facultativa',
  Pilote: 'Coordinador de obra',
  SousTraitant: 'Subcontratista',

  // Estados de obra
  en_preparation: 'En preparación',
  en_cours: 'En curso',
  en_pause: 'En pausa',
  archive: 'Archivado',
  cloture: 'Cerrado',

  // Estados de reserva
  creee: 'Creada',
  affectee: 'Asignada',
  prise_en_charge: 'Asumida',
  corrigee: 'Corregida',
  a_verifier: 'Por verificar',
  validee: 'Validada',
  refusee: 'Rechazada',
  rouverte: 'Reabierta',
  en_retard: 'Retrasada',
  cloturee: 'Cerrada',

  // États d'un rapport (cahier des charges Rapports § 19). `archive` est
  // déjà défini plus haut, avec le même libellé.
  brouillon: 'Borrador',
  en_attente: 'En espera',
  generation: 'Generando',
  genere: 'Generado',
  envoye: 'Enviado',
  echec: 'Error',

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
  rejete: 'Rechazado',

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
};
