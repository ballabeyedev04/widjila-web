import { describe, it, expect } from 'vitest';
import { normalizeList } from './helpers.js';

/**
 * Tests — normalisation des listes paginées.
 *
 * Le backend renvoie le total sous deux formes selon les modules. La forme
 * IMBRIQUÉE (`pagination.total`), utilisée par les référentiels et le
 * catalogue des formules, n'était pas lue : le total retombait sur la taille
 * de page, la pagination n'affichait qu'une seule page et les suivantes
 * étaient inatteignables. Rien ne le signalait — l'écran paraissait
 * simplement contenir peu de lignes.
 */

describe('total à plat', () => {
  it('lit `total` quand il est présent', () => {
    const res = normalizeList({ membres: [{ id: 1 }], total: 57 }, 'membres');
    expect(res.total).toBe(57);
    expect(res.items).toHaveLength(1);
  });
});

describe('total imbriqué dans `pagination`', () => {
  it('lit `pagination.total` avec une clé explicite', () => {
    const res = normalizeList(
      { corpsEtat: [{ id: 1 }, { id: 2 }], pagination: { total: 43, page: 1, limit: 12 } },
      'corpsEtat'
    );
    // Sans ce correctif : 2, soit la taille de la page.
    expect(res.total).toBe(43);
  });

  it('lit `pagination.total` par détection automatique de la clé', () => {
    const res = normalizeList({ types: [{ id: 1 }], pagination: { total: 9 } });
    expect(res.total).toBe(9);
    expect(res.items).toHaveLength(1);
  });
});

describe('cas limites', () => {
  it('préfère `total` à plat quand les deux sont présents', () => {
    const res = normalizeList({ items: [], total: 5, pagination: { total: 99 } });
    expect(res.total).toBe(5);
  });

  it('conserve un total de 0 légitime', () => {
    // `?? 0` ou `|| items.length` écraseraient un zéro parfaitement valide.
    const res = normalizeList({ types: [], pagination: { total: 0 } }, 'types');
    expect(res.total).toBe(0);
  });

  it('retombe sur la longueur quand aucun total n’est fourni', () => {
    const res = normalizeList({ plans: [{ id: 1 }, { id: 2 }] });
    expect(res.total).toBe(2);
  });

  it('ignore un total non numérique', () => {
    const res = normalizeList({ types: [{ id: 1 }], pagination: { total: 'beaucoup' } }, 'types');
    expect(res.total).toBe(1);
  });

  it('rend une liste vide sur un payload absent', () => {
    expect(normalizeList(null)).toEqual({ items: [], total: 0 });
    expect(normalizeList(undefined)).toEqual({ items: [], total: 0 });
  });

  it('rend une liste vide sur un payload sans tableau connu', () => {
    expect(normalizeList({ inattendu: 'x' })).toEqual({ items: [], total: 0 });
  });
});
