/** Namespace `enums` — libellés des énumérations métier (statuts, rôles, types). *
 * Langue : EN. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  // Roles
  Admin: 'Administrator',
  ChefProjet: 'Project manager',
  ConducteurTravaux: 'Site manager',
  BureauControle: 'Inspection body',
  Entreprise: 'Contractor',
  Client: 'Client',
  MaitreOuvrage: 'Project owner',
  MaitreOeuvre: 'Project supervisor',
  Pilote: 'Site coordinator',
  SousTraitant: 'Subcontractor',

  // Site statuses
  en_preparation: 'In preparation',
  en_cours: 'In progress',
  en_pause: 'On hold',
  archive: 'Archived',
  cloture: 'Closed',

  // Snag statuses
  creee: 'Created',
  affectee: 'Assigned',
  prise_en_charge: 'Acknowledged',
  corrigee: 'Corrected',
  a_verifier: 'To be checked',
  validee: 'Approved',
  refusee: 'Rejected',
  rouverte: 'Reopened',
  en_retard: 'Overdue',
  cloturee: 'Closed',

  // États d'un rapport (cahier des charges Rapports § 19). `archive` est
  // déjà défini plus haut, avec le même libellé.
  brouillon: 'Draft',
  en_attente: 'Pending',
  generation: 'Generating',
  genere: 'Generated',
  envoye: 'Sent',
  echec: 'Failed',

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
  rejete: 'Rejected',

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
};
