/**
 * Couleur du repère d'une réserve posée sur un plan, par GRAVITÉ.
 *
 * Écrite une seule fois : la même table vivait dans `PlanNavigateur` et devait
 * être recopiée dans l'explorateur de plans. Deux copies d'une palette, c'est
 * la garantie qu'un jour « critique » sera rouge d'un côté et orange de
 * l'autre, sur le même plan, selon le parcours emprunté pour y arriver.
 *
 * Les valeurs sont des variables CSS du thème, jamais des couleurs en dur :
 * elles suivent ainsi la charte et le mode sombre sans intervention.
 */
export const COULEUR_SEVERITE = {
  faible: 'var(--info)',
  moyenne: 'var(--warning)',
  haute: 'var(--danger)',
  critique: 'var(--danger)',
};

/** Couleur d'une gravité, avec repli sur la couleur primaire du thème. */
export const couleurSeverite = (severite) => COULEUR_SEVERITE[severite] || 'var(--primary)';
