/**
 * Ce que partagent l'écran de dépôt, ses blocs et ses modales.
 *
 * Extrait de `DepotPlans.jsx` au moment de son découpage : ces quatre
 * valeurs étaient utilisées par des composants qui vivent désormais dans
 * trois fichiers. Les recopier aurait garanti qu'un jour la liste des
 * extensions acceptées diverge d'un endroit à l'autre.
 */
/** Extensions acceptées — les mêmes que le mobile et que le serveur. */
export const EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.dwg,.dxf';

/**
 * `format` n'accepte que trois valeurs côté serveur. Une image n'en est pas
 * une : on omet le champ plutôt que d'inventer une valeur qui serait refusée.
 */
export function formatDe(nomFichier) {
  const ext = (nomFichier || '').split('.').pop()?.toLowerCase();
  return ['pdf', 'dwg', 'ifc'].includes(ext) ? ext : undefined;
}

/** Les trois sections d'un bâtiment, dans l'ordre où on les monte. */
export const SECTIONS = [
  { type: 'sous_sol', cle: 'sousSols' },
  { type: 'etage', cle: 'etages' },
  { type: 'toiture', cle: 'toiture' },
];

let compteurTemp = 0;
export const idTemp = () => `brouillon-${++compteurTemp}`;
