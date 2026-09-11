/** Namespace `enums` — libellés des énumérations métier (statuts, rôles, types). *
 * Langue : FR. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  // Rôles
  Admin: 'Administrateur',
  ChefProjet: 'Chef de projet',
  ConducteurTravaux: 'Conducteur de travaux',
  BureauControle: 'Bureau de contrôle',
  Entreprise: 'Entreprise',
  Client: 'Client',
  MaitreOuvrage: "Maître d'ouvrage",
  MaitreOeuvre: "Maître d'œuvre",
  Pilote: 'Pilote de chantier',
  SousTraitant: 'Sous-traitant',

  // Statuts de chantier
  en_preparation: 'En préparation',
  en_cours: 'En cours',
  en_pause: 'En pause',
  archive: 'Archivé',
  cloture: 'Clôturé',

  // Statuts de réserve
  creee: 'Créée',
  affectee: 'Affectée',
  prise_en_charge: 'Prise en charge',
  corrigee: 'Corrigée',
  a_verifier: 'À vérifier',
  validee: 'Validée',
  refusee: 'Refusée',
  rouverte: 'Rouverte',
  en_retard: 'En retard',
  cloturee: 'Clôturée',

  // États d'un rapport (cahier des charges Rapports § 19). `archive` est
  // déjà défini plus haut, avec le même libellé.
  brouillon: 'Brouillon',
  en_attente: 'En attente',
  generation: 'Génération en cours',
  genere: 'Généré',
  envoye: 'Envoyé',
  echec: 'Échec',

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
  rejete: 'Rejeté',

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
};
