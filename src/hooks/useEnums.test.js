import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../service/referentiel/referentielService.js', () => ({
  chargerEnums: vi.fn(),
}));

import { chargerEnums } from '../service/referentiel/referentielService.js';
import { useEnum, useEnums, _reinitialiserCacheEnums } from './useEnums.js';

/**
 * Tests — énumérations servies par le backend.
 *
 * Ce hook remplace des listes recopiées à la main. Ce qui doit être verrouillé :
 *
 *   1. le REPLI local couvre l'instant d'avant la réponse — sans lui, chaque
 *      filtre et chaque badge serait vide au premier rendu ;
 *   2. le serveur fait foi ensuite, Y COMPRIS pour une valeur que le repli ne
 *      connaît pas — c'est tout l'intérêt de l'endpoint ;
 *   3. un échec réseau ne casse rien et ne remonte aucune erreur : le repli
 *      suffit, et une bannière pour des libellés de badge n'aiderait personne ;
 *   4. le cache évite une requête par écran, pour une réponse identique.
 */

beforeEach(() => {
  _reinitialiserCacheEnums();
  vi.mocked(chargerEnums).mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe('repli local', () => {
  it('rend une liste non vide AVANT la réponse du serveur', () => {
    // Promesse jamais résolue : on observe l'état initial.
    vi.mocked(chargerEnums).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useEnum('statutsReserve'));

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current).toContain('creee');
  });

  it('reste utilisable quand l’appel échoue', async () => {
    vi.mocked(chargerEnums).mockRejectedValue(new Error('réseau indisponible'));

    const { result } = renderHook(() => useEnum('severites'));

    await waitFor(() => expect(chargerEnums).toHaveBeenCalled());
    expect(result.current).toContain('critique');
  });
});

describe('le serveur fait foi', () => {
  it('adopte la liste reçue, ordre compris', async () => {
    vi.mocked(chargerEnums).mockResolvedValue({
      statutsReserve: ['creee', 'validee'],
    });

    const { result } = renderHook(() => useEnum('statutsReserve'));

    await waitFor(() => expect(result.current).toEqual(['creee', 'validee']));
  });

  it('expose une valeur INCONNUE du repli', async () => {
    // Le cas qui justifie l'endpoint : un statut ajouté côté backend doit
    // apparaître dans les filtres sans toucher au frontend.
    vi.mocked(chargerEnums).mockResolvedValue({
      statutsReserve: ['creee', 'en_arbitrage'],
    });

    const { result } = renderHook(() => useEnum('statutsReserve'));

    await waitFor(() => expect(result.current).toContain('en_arbitrage'));
  });

  it('ignore une réponse vide plutôt que de vider les listes', async () => {
    // Un serveur qui répond `{}` ne doit pas éteindre tous les filtres de
    // l'application : le repli reste en place.
    vi.mocked(chargerEnums).mockResolvedValue({});

    const { result } = renderHook(() => useEnum('statutsChantier'));

    await waitFor(() => expect(chargerEnums).toHaveBeenCalled());
    expect(result.current).toContain('en_cours');
  });
});

describe('cache', () => {
  it('n’appelle le serveur qu’une fois pour plusieurs composants', async () => {
    vi.mocked(chargerEnums).mockResolvedValue({ roles: ['Admin'] });

    const premier = renderHook(() => useEnums());
    await waitFor(() => expect(premier.result.current.roles).toEqual(['Admin']));

    const second = renderHook(() => useEnums());
    await waitFor(() => expect(second.result.current.roles).toEqual(['Admin']));

    expect(chargerEnums).toHaveBeenCalledTimes(1);
  });
});

describe('clé inconnue', () => {
  it('rend un tableau vide plutôt que undefined', () => {
    vi.mocked(chargerEnums).mockReturnValue(new Promise(() => {}));

    // `.map()` sur `undefined` planterait l'écran ; un tableau vide affiche
    // simplement une liste sans option.
    const { result } = renderHook(() => useEnum('cleQuiNExistePas'));

    expect(result.current).toEqual([]);
  });
});
