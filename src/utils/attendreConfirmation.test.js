import { describe, it, expect, vi } from 'vitest';

import { attendreConfirmation } from './attendreConfirmation.js';

/**
 * L'attente de confirmation d'un paiement par le serveur.
 *
 * Règle tenue ici : l'interface n'annonce JAMAIS un paiement réussi sur la foi
 * du client — ni d'un statut Stripe, ni d'un paramètre d'URL. Seul le serveur,
 * une fois le webhook reçu, fait foi. Et quand il tarde, on ne conclut pas à
 * l'échec : on dit qu'on ne sait pas encore.
 */

const sansAttente = { dormir: async () => {} };

describe('attendreConfirmation', () => {
  it('rend vrai dès que le serveur confirme', async () => {
    const verifier = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    expect(await attendreConfirmation(verifier, sansAttente)).toBe(true);
    expect(verifier).toHaveBeenCalledTimes(2);
  });

  it('rend faux — sans lever — si le serveur ne confirme jamais', async () => {
    const verifier = vi.fn().mockResolvedValue(false);

    expect(await attendreConfirmation(verifier, { ...sansAttente, attentes: [0, 1, 1] })).toBe(false);
    expect(verifier).toHaveBeenCalledTimes(3);
  });

  it('une coupure réseau n’est pas une réponse : on retente', async () => {
    const verifier = vi.fn()
      .mockRejectedValueOnce(new Error('réseau'))
      .mockResolvedValueOnce(true);

    expect(await attendreConfirmation(verifier, sansAttente)).toBe(true);
  });

  it('attend entre deux essais, avec des délais croissants', async () => {
    const dormir = vi.fn(async () => {});
    const verifier = vi.fn().mockResolvedValue(false);

    await attendreConfirmation(verifier, { dormir, attentes: [0, 900, 1600] });

    // Le premier essai part tout de suite ; les suivants attendent.
    expect(dormir.mock.calls.map(([ms]) => ms)).toEqual([900, 1600]);
  });
});
