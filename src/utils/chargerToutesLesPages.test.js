import { describe, it, expect, vi } from 'vitest';

import { chargerToutesLesPages } from './chargerToutesLesPages.js';

/**
 * Le chargement complet d'une liste de référence.
 *
 * Ce que ces tests verrouillent :
 *
 *   1. AU-DELÀ DE 100 ENTRÉES, RIEN NE DISPARAÎT. C'est le défaut d'origine :
 *      le serveur plafonne toute page à 100 et le fait en SILENCE — `limit: 200`
 *      est ramené à 100 sans un mot. Passé le centième chantier, le filtre
 *      cessait d'en proposer certains, sans message ni compteur.
 *   2. LA BOUCLE S'ARRÊTE TOUJOURS. Un `total` erroné ou une page vide ne
 *      doivent pas transformer un sélecteur en requêtes à l'infini depuis le
 *      navigateur d'un client.
 */

/** Serveur factice : `n` entrées, servies par pages de `limit`, plafonnées à 100. */
function serveur(n) {
  const appels = [];
  const lister = vi.fn(async ({ page, limit }) => {
    // Le vrai serveur ramène toute limite au-dessus de 100 : on le reproduit,
    // sans quoi le test validerait un comportement que la production n'a pas.
    const taille = Math.min(limit, 100);
    appels.push({ page, limit: taille });
    const debut = (page - 1) * taille;
    return {
      items: Array.from({ length: Math.max(0, Math.min(taille, n - debut)) }, (_, i) => ({ id: debut + i })),
      total: n,
    };
  });
  return { lister, appels };
}

describe('liste plus courte qu’une page', () => {
  it('une seule requête suffit', async () => {
    const { lister } = serveur(12);

    const tout = await chargerToutesLesPages(lister);

    expect(tout).toHaveLength(12);
    expect(lister).toHaveBeenCalledTimes(1);
  });
});

describe('liste plus longue que le plafond du serveur', () => {
  it('ramène les 250 entrées, pas les 100 premières', async () => {
    const { lister } = serveur(250);

    const tout = await chargerToutesLesPages(lister);

    expect(tout).toHaveLength(250);
    expect(lister).toHaveBeenCalledTimes(3);
  });

  it('ne demande jamais plus de 100 par page — le serveur l’imposerait de toute façon', async () => {
    const { lister, appels } = serveur(250);

    await chargerToutesLesPages(lister);

    expect(appels.every((a) => a.limit <= 100)).toBe(true);
  });

  it('transmet les filtres à CHAQUE page', async () => {
    const { lister } = serveur(150);

    await chargerToutesLesPages(lister, { filtres: { statut: 'actif' } });

    for (const appel of lister.mock.calls) {
      expect(appel[0].statut).toBe('actif');
    }
  });
});

describe('arrêt de la boucle', () => {
  it('s’arrête sur une page vide, même si le serveur annonce un total plus grand', async () => {
    const lister = vi.fn(async ({ page }) => (
      page === 1
        ? { items: [{ id: 1 }], total: 5000 }
        : { items: [], total: 5000 }
    ));

    const tout = await chargerToutesLesPages(lister);

    expect(tout).toHaveLength(1);
    expect(lister).toHaveBeenCalledTimes(2);
  });

  it('respecte le garde-fou `maxPages` si le serveur ne se tarit jamais', async () => {
    const lister = vi.fn(async () => ({ items: [{ id: 1 }], total: Number.MAX_SAFE_INTEGER }));

    const tout = await chargerToutesLesPages(lister, { maxPages: 4 });

    expect(lister).toHaveBeenCalledTimes(4);
    expect(tout).toHaveLength(4);
  });

  it('supporte une réponse sans `total`', async () => {
    const lister = vi.fn(async () => ({ items: [{ id: 1 }] }));

    const tout = await chargerToutesLesPages(lister);

    expect(tout).toHaveLength(1);
    expect(lister).toHaveBeenCalledTimes(1);
  });
});
