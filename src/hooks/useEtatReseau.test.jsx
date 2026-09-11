import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useEtatReseau } from './useEtatReseau.js';

/**
 * L'état du réseau.
 *
 * Ce que ces tests verrouillent :
 *
 *   1. LA COUPURE EST DÉTECTÉE. Sans cela, une perte de réseau produisait la
 *      même alerte rouge qu'une panne serveur — et l'utilisateur refaisait sa
 *      saisie trois fois en pensant que l'application était cassée.
 *   2. LE RETOUR AUSSI. Un bandeau qui ne disparaît pas quand le réseau revient
 *      est pire qu'absent : on cesse de le croire.
 *   3. LES ÉCOUTEURS SONT RETIRÉS au démontage — un hook monté sur chaque écran
 *      qui laisserait ses écouteurs derrière lui en accumulerait un par
 *      navigation.
 */

/** Force `navigator.onLine`, que jsdom expose en lecture seule. */
function simulerReseau(enLigne) {
  Object.defineProperty(window.navigator, 'onLine', {
    value: enLigne,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  simulerReseau(true);
  vi.restoreAllMocks();
});

describe('état initial', () => {
  it('en ligne par défaut', () => {
    simulerReseau(true);

    const { result } = renderHook(() => useEtatReseau());

    expect(result.current).toBe(true);
  });

  it('hors ligne si l’appareil l’est DÉJÀ au montage', () => {
    // Le cas d'un onglet rouvert alors que le réseau est coupé : attendre
    // l'événement `offline` ne suffirait pas, il ne se produira jamais.
    simulerReseau(false);

    const { result } = renderHook(() => useEtatReseau());

    expect(result.current).toBe(false);
  });
});

describe('bascules', () => {
  it('suit la coupure', () => {
    simulerReseau(true);
    const { result } = renderHook(() => useEtatReseau());

    act(() => {
      simulerReseau(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('suit le retour du réseau', () => {
    simulerReseau(false);
    const { result } = renderHook(() => useEtatReseau());

    act(() => {
      simulerReseau(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });
});

describe('nettoyage', () => {
  it('retire ses deux écouteurs au démontage', () => {
    const retirer = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useEtatReseau());
    unmount();

    const retires = retirer.mock.calls.map(([evenement]) => evenement);
    expect(retires).toContain('online');
    expect(retires).toContain('offline');
  });
});
