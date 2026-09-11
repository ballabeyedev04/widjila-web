/** Namespace `enums` — libellés des énumérations métier (statuts, rôles, types). *
 * Langue : DE. Les quatre langues vivent dans des fichiers séparés pour
 * qu'un lecteur ne télécharge que la sienne — voir i18n/index.js.
 */
export default {
  // Rollen
  Admin: 'Administrator',
  ChefProjet: 'Projektleiter',
  ConducteurTravaux: 'Bauleiter',
  BureauControle: 'Prüfstelle',
  Entreprise: 'Bauunternehmen',
  Client: 'Kunde',
  MaitreOuvrage: 'Bauherr',
  MaitreOeuvre: 'Planer',
  Pilote: 'Baustellenkoordinator',
  SousTraitant: 'Subunternehmer',

  // Baustellenstatus
  en_preparation: 'In Vorbereitung',
  en_cours: 'In Bearbeitung',
  en_pause: 'Pausiert',
  archive: 'Archiviert',
  cloture: 'Abgeschlossen',

  // Mängelstatus
  creee: 'Erstellt',
  affectee: 'Zugewiesen',
  prise_en_charge: 'Angenommen',
  corrigee: 'Behoben',
  a_verifier: 'Zu prüfen',
  validee: 'Freigegeben',
  refusee: 'Abgelehnt',
  rouverte: 'Wiedereröffnet',
  en_retard: 'Überfällig',
  cloturee: 'Geschlossen',

  // États d'un rapport (cahier des charges Rapports § 19). `archive` est
  // déjà défini plus haut, avec le même libellé.
  brouillon: 'Entwurf',
  en_attente: 'Wartend',
  generation: 'Wird erstellt',
  genere: 'Erstellt',
  envoye: 'Gesendet',
  echec: 'Fehlgeschlagen',

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
  rejete: 'Abgelehnt',

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
};
