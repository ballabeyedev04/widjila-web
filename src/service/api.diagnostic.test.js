import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';

import api, { enrichirErreur } from './api.js';
import { estPanneRequete } from '../utils/monitoring.js';

/**
 * Diagnostic des erreurs de requête — identifiant de requête et signalement.
 *
 * Défauts corrigés :
 *   - le serveur renvoie `requestId` et `error.code` dans tout corps
 *     d'erreur ; le web ne les lisait pas : une erreur signalée ne désignait
 *     aucune ligne des journaux serveur ;
 *   - une panne serveur (5xx) ou réseau n'était signalée au monitoring que si
 *     elle faisait planter le rendu — une erreur affichée puis fermée ne
 *     laissait aucune trace pour l'équipe.
 */

const adaptateurOrigine = api.defaults.adapter;

/** Adaptateur qui répond `statut` avec `corps` et `entetes`, sans réseau. */
const repondre = (statut, corps, entetes = {}) => {
  api.defaults.adapter = async (config) => {
    const reponse = { data: corps, status: statut, statusText: '', headers: entetes, config };
    throw new AxiosError(`Request failed with status code ${statut}`, 'ERR_BAD_RESPONSE', config, null, reponse);
  };
};

let console_;
beforeEach(() => { console_ = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => {
  api.defaults.adapter = adaptateurOrigine;
  vi.restoreAllMocks();
});

const rapports = () => console_.mock.calls.filter((appel) => appel[0] === '[monitoring]');

describe('erreur de requête', () => {
  it('503 : porte le requestId et le code du serveur, et la panne est signalée', async () => {
    repondre(503, {
      success: false,
      message: 'Service temporairement indisponible',
      error: { code: 'BASE_INDISPONIBLE', message: 'Service temporairement indisponible' },
      requestId: 'req-serveur-1234',
    });

    const err = await api.get('/chantiers').catch((e) => e);

    expect(err.requestId).toBe('req-serveur-1234');
    expect(err.codeErreur).toBe('BASE_INDISPONIBLE');
    expect(rapports()).toHaveLength(1);
    expect(rapports()[0][1]).toMatchObject({ requestId: 'req-serveur-1234', statut: 503, chemin: '/chantiers' });
  });

  it('404 : identifiant repris de l’en-tête, mais AUCUN signalement (refus métier normal)', async () => {
    repondre(404, '<html>introuvable</html>', { 'x-request-id': 'entete-reponse-1' });

    const err = await api.get('/chantiers/inconnu').catch((e) => e);

    expect(err.requestId).toBe('entete-reponse-1');
    expect(rapports()).toHaveLength(0);
  });
});

describe('enrichirErreur', () => {
  it('sans réponse (coupure réseau), laisse l’erreur intacte', () => {
    const err = new Error('Network Error');

    expect(enrichirErreur(err)).toBe(err);
    expect(err.requestId).toBeUndefined();
  });
});

describe('estPanneRequete', () => {
  it.each([
    ['5xx', { isAxiosError: true, config: {}, response: { status: 502 } }, true],
    ['aucune réponse (réseau, délai)', { isAxiosError: true, config: {} }, true],
    ['refus métier 4xx', { isAxiosError: true, config: {}, response: { status: 422 } }, false],
    ['requête annulée', { isAxiosError: true, config: {}, code: 'ERR_CANCELED' }, false],
    ['erreur ordinaire', new Error('x'), false],
  ])('%s → %s', (_, err, attendu) => {
    expect(estPanneRequete(err)).toBe(attendu);
  });
});
