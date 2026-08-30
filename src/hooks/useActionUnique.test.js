import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActionUnique } from './useActionUnique.js';

/**
 * Tests — protection contre la double exécution d'une action.
 *
 * Le cas réel visé : deux clics avant que React n'ait re-rendu. `disabled` et
 * une garde `if (saving) return;` échouent tous deux dans cette situation —
 * la garde parce que les deux invocations lisent la même valeur figée du
 * rendu en cours. Seule une `ref` bloque le second appel.
 *
 * Sur une suppression, une création ou un encaissement, la double exécution
 * n'est pas un défaut d'affichage : elle produit deux enregistrements, ou
 * deux débits.
 */

describe('double appel', () => {
  it('n’exécute l’action qu’UNE fois sur deux appels simultanés', async () => {
    const action = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 30)));
    const { result } = renderHook(() => useActionUnique());

    // Les deux appels partent AVANT tout nouveau rendu : c'est exactement le
    // scénario où `disabled` et une garde sur l'état échouent.
    await act(async () => {
      const a = result.current.executer(action);
      const b = result.current.executer(action);
      await Promise.all([a, b]);
    });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('rend `undefined` pour l’appel refusé', async () => {
    const action = vi.fn(async () => 'resultat');
    const { result } = renderHook(() => useActionUnique());

    let premier;
    let second;
    await act(async () => {
      const a = result.current.executer(action);
      const b = result.current.executer(action);
      [premier, second] = await Promise.all([a, b]);
    });

    expect(premier).toBe('resultat');
    expect(second).toBeUndefined();
  });
});

describe('libération du verrou', () => {
  it('autorise un nouvel appel une fois l’action terminée', async () => {
    const action = vi.fn(async () => 'ok');
    const { result } = renderHook(() => useActionUnique());

    await act(async () => { await result.current.executer(action); });
    await act(async () => { await result.current.executer(action); });

    expect(action).toHaveBeenCalledTimes(2);
  });

  it('relâche le verrou même si l’action ÉCHOUE', async () => {
    // Sans le `finally`, une erreur réseau condamnerait le bouton jusqu'au
    // rechargement de la page.
    const action = vi.fn(async () => { throw new Error('réseau indisponible'); });
    const { result } = renderHook(() => useActionUnique());

    await act(async () => {
      await expect(result.current.executer(action)).rejects.toThrow('réseau');
    });

    await waitFor(() => expect(result.current.enCours).toBe(false));

    await act(async () => {
      await expect(result.current.executer(action)).rejects.toThrow('réseau');
    });
    expect(action).toHaveBeenCalledTimes(2);
  });
});

describe('état d’affichage', () => {
  it('expose `enCours` pendant l’exécution', async () => {
    let relacher;
    const action = () => new Promise((resolve) => { relacher = resolve; });
    const { result } = renderHook(() => useActionUnique());

    expect(result.current.enCours).toBe(false);

    let promesse;
    act(() => { promesse = result.current.executer(action); });
    await waitFor(() => expect(result.current.enCours).toBe(true));

    await act(async () => { relacher(); await promesse; });
    expect(result.current.enCours).toBe(false);
  });
});
