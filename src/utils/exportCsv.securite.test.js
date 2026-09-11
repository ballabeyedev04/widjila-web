import { describe, it, expect } from 'vitest';

import { celluleCsv } from './exportCsv.js';

/**
 * Export CSV — aucune formule exécutable chez celui qui ouvre le fichier.
 *
 * Les exports reprennent des textes saisis par d'autres. Une réserve intitulée
 * `=HYPERLINK("https://pirate";"Voir")` devenait un lien piégé dans le tableur
 * de l'administrateur qui exportait (injection de formule / CSV injection).
 */

describe('celluleCsv', () => {
  it.each([
    '=HYPERLINK("https://pirate.example";"Voir")',
    '+cmd|\' /C calc\'!A0',
    '-2+3',
    '@SUM(A1:A9)',
    '\t=1+1',
    '\r=1+1',
  ])('neutralise la formule %j', (valeur) => {
    const cellule = celluleCsv(valeur);

    // La cellule commence par une apostrophe : le tableur la lit comme du texte.
    expect(cellule.startsWith('"\'')).toBe(true);
  });

  it('laisse un texte ordinaire intact', () => {
    expect(celluleCsv('Fissure dalle R+1')).toBe('"Fissure dalle R+1"');
  });

  it('laisse un NOMBRE négatif intact', () => {
    expect(celluleCsv(-5)).toBe('"-5"');
  });

  it('double toujours les guillemets', () => {
    expect(celluleCsv('Dit "urgent"')).toBe('"Dit ""urgent"""');
  });

  it('rend une cellule vide pour null / undefined', () => {
    expect(celluleCsv(null)).toBe('""');
    expect(celluleCsv(undefined)).toBe('""');
  });
});
