import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useServerList } from './useServerList.js';

// SweetAlert ouvre une vraie modale : inutile et bruyant en test.
vi.mock('../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

/** Fabrique une erreur axios avec un statut et un message serveur. */
const erreurHttp = (status, message) => ({
  response: { status, data: message ? { message } : {} },
});

describe('useServerList — refus 403', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CONSERVE le message du serveur sur un 403', async () => {
    // C'est le cœur du correctif : le message était jeté, et l'utilisateur
    // lisait « super-admin requis » alors qu'il EST super-admin et qu'il lui
    // manquait seulement la MFA.
    const messageServeur =
      "L'authentification à deux facteurs (MFA) est obligatoire pour le rôle super-admin.";
    const fetchFn = vi.fn().mockRejectedValue(erreurHttp(403, messageServeur));

    const { result } = renderHook(() => useServerList(fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessDenied).toBe(true);
    expect(result.current.error).toBe(messageServeur);
  });

  it('reste utilisable si le 403 ne porte aucun message', async () => {
    const fetchFn = vi.fn().mockRejectedValue(erreurHttp(403));
    const { result } = renderHook(() => useServerList(fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessDenied).toBe(true);
    // `null` et non `undefined` : l'écran affiche alors son titre générique
    // sans paragraphe vide.
    expect(result.current.error).toBeNull();
  });

  it('un 401 ne remonte NI accessDenied NI erreur', async () => {
    // L'intercepteur axios tente un renouvellement silencieux : afficher une
    // erreur ici ferait clignoter un écran de panne à chaque expiration.
    const fetchFn = vi.fn().mockRejectedValue(erreurHttp(401, 'Token expiré'));
    const { result } = renderHook(() => useServerList(fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessDenied).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('une erreur serveur remonte son message sans accessDenied', async () => {
    const fetchFn = vi.fn().mockRejectedValue(erreurHttp(500, 'Erreur interne'));
    const { result } = renderHook(() => useServerList(fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessDenied).toBe(false);
    expect(result.current.error).toBe('Erreur interne');
  });

  it('un chargement réussi efface un refus précédent', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ items: [{ id: '1' }], total: 1 });
    const { result } = renderHook(() => useServerList(fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessDenied).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.items).toHaveLength(1);
  });
});
