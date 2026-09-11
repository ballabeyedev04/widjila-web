import { describe, it, expect, vi, afterEach } from 'vitest';

import { reporter } from './monitoring.js';

/**
 * Le monitoring ne doit jamais transporter une session.
 *
 * Une erreur axios porte sa configuration complète — donc
 * `config.headers.Authorization: Bearer …`. `reporter()` l'écrivait telle
 * quelle dans la console, que le monitoring capture comme fil d'Ariane : la
 * session d'un utilisateur finissait en clair dans un outil tiers, valable une
 * heure. Ces tests interrogent ce qui est RÉELLEMENT écrit.
 */

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.c2lnbmF0dXJlLWZhdXNzZQ';

afterEach(() => vi.restoreAllMocks());

describe('reporter', () => {
  it('n’écrit ni l’en-tête Authorization ni le jeton', () => {
    const console_ = vi.spyOn(console, 'error').mockImplementation(() => {});
    const erreur = Object.assign(new Error('Request failed with status code 500'), {
      isAxiosError: true,
      config: { method: 'get', url: '/chantiers', headers: { Authorization: `Bearer ${JWT}` } },
      response: { status: 500 },
    });

    reporter(erreur, { source: 'test', jeton: JWT });

    const ecrit = JSON.stringify(console_.mock.calls, (_cle, v) => (v instanceof Error
      ? { ...v, message: v.message, stack: v.stack }
      : v));
    expect(ecrit).not.toContain(JWT);
    expect(ecrit).not.toContain('Authorization');
    // L'essentiel reste lisible pour qui enquête.
    expect(ecrit).toContain('/chantiers');
    expect(ecrit).toContain('500');
  });

  it('garde intacte une erreur ordinaire', () => {
    const console_ = vi.spyOn(console, 'error').mockImplementation(() => {});

    reporter(new TypeError('x est indéfini'), { source: 'test' });

    const [, erreurEcrite] = console_.mock.calls[0];
    expect(erreurEcrite.message).toBe('x est indéfini');
  });
});
