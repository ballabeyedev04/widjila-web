/**
 * Palette des graphiques — DÉRIVÉE de l'identité existante, jamais inventée.
 *
 * Les valeurs ne sont pas écrites en dur : ce sont les variables CSS déjà
 * définies dans `index.css` (`--primary`, `--accent`, `--success`…). Les
 * graphiques héritent donc automatiquement de tout changement de charte, et
 * un thème sombre futur n'aurait rien à reprendre ici.
 */

/** Couleur de série, par rôle sémantique. */
export const TEINTES = {
  primaire: 'var(--primary)',
  primaireClair: 'var(--primary-light)',
  accent: 'var(--accent)',
  succes: 'var(--success)',
  danger: 'var(--danger)',
  alerte: 'var(--warning)',
  info: 'var(--info)',
  neutre: 'var(--text-muted)',
};

/**
 * Couleur d'un statut de réserve.
 *
 * Alignée sur les `tone` de `STATUTS_RESERVE` (utils/constants.js) : un même
 * statut doit avoir la même couleur dans un badge de tableau et dans un
 * secteur de donut, sinon le lecteur doit réapprendre le code à chaque écran.
 */
export const COULEUR_STATUT = {
  creee: TEINTES.neutre,
  affectee: TEINTES.info,
  prise_en_charge: TEINTES.info,
  en_cours: TEINTES.alerte,
  corrigee: TEINTES.primaire,
  a_verifier: TEINTES.alerte,
  validee: TEINTES.succes,
  refusee: TEINTES.danger,
  rouverte: TEINTES.danger,
  en_retard: TEINTES.danger,
  cloturee: TEINTES.neutre,
};

/** Couleur d'une sévérité — même logique que ci-dessus. */
export const COULEUR_SEVERITE = {
  faible: TEINTES.info,
  moyenne: TEINTES.alerte,
  haute: TEINTES.danger,
  critique: TEINTES.danger,
};

/**
 * Suite de repli pour les séries sans sémantique propre (top chantiers, top
 * entreprises). Ordonnée du plus saillant au plus discret : la première barre
 * d'un classement est celle qu'on veut voir en premier.
 */
export const SERIE_NEUTRE = [
  TEINTES.primaire,
  TEINTES.accent,
  TEINTES.info,
  TEINTES.primaireClair,
  TEINTES.succes,
  TEINTES.neutre,
];

export const couleurPourIndex = (i) => SERIE_NEUTRE[i % SERIE_NEUTRE.length];
