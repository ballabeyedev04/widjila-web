import { describe, it, expect, vi } from 'vitest';

import { installerDeduplication } from './dedupe.js';

/**
 * La déduplication des écritures en vol.
 *
 * Ce que ces tests verrouillent, dans l'ordre de ce qui coûte le plus cher :
 *
 *   1. UN DOUBLE CLIC N'ÉCRIT QU'UNE FOIS. C'est le défaut d'origine : trente-neuf
 *      formulaires s'en remettaient à `disabled={saving}`, qui ne prend effet
 *      qu'au rendu suivant. Deux clics avant ce rendu créaient deux réserves,
 *      deux membres, deux demandes — ou deux intentions de débit.
 *   2. DEUX ÉCRITS DIFFÉRENTS PARTENT TOUS LES DEUX. Une déduplication trop
 *      large serait pire que le mal : elle avalerait des saisies légitimes.
 *   3. LA FENÊTRE SE REFERME À LA RÉPONSE, succès comme échec. Après une erreur
 *      réseau, l'utilisateur reclique — et ce second envoi doit partir.
 *   4. LES LECTURES NE SONT PAS TOUCHÉES : deux composants montés en même temps
 *      ont le droit de lire la même URL.
 */

/** Instance factice : chaque méthode compte ses appels et rend une promesse pilotable. */
function fausseInstance() {
  const appels = [];
  const resolveurs = [];
  const fabrique = (methode) => vi.fn((url, ...reste) => {
    appels.push({ methode, url, corps: reste[0] });
    return new Promise((resolve, reject) => resolveurs.push({ resolve, reject }));
  });

  return {
    instance: {
      get: fabrique('get'),
      post: fabrique('post'),
      put: fabrique('put'),
      patch: fabrique('patch'),
      delete: fabrique('delete'),
    },
    appels,
    resolveurs,
  };
}

// ── 1. Le double clic ───────────────────────────────────────────────────────

describe('écriture dupliquée', () => {
  it('deux envois identiques simultanés ne partent qu’UNE fois', () => {
    const { instance, appels } = fausseInstance();
    installerDeduplication(instance);

    instance.post('/reserves', { titre: 'Fissure' });
    instance.post('/reserves', { titre: 'Fissure' });

    expect(appels).toHaveLength(1);
  });

  it('les deux appelants reçoivent la MÊME promesse', () => {
    const { instance } = fausseInstance();
    installerDeduplication(instance);

    const a = instance.post('/reserves', { titre: 'Fissure' });
    const b = instance.post('/reserves', { titre: 'Fissure' });

    expect(a).toBe(b);
  });

  it('couvre les quatre méthodes d’écriture', () => {
    const { instance, appels } = fausseInstance();
    installerDeduplication(instance);

    for (const methode of ['post', 'put', 'patch']) {
      instance[methode]('/x', { a: 1 });
      instance[methode]('/x', { a: 1 });
    }
    instance.delete('/x');
    instance.delete('/x');

    expect(appels).toHaveLength(4);
  });
});

// ── 2. Ce qui ne doit PAS être confondu ─────────────────────────────────────

describe('écritures distinctes', () => {
  it('deux corps différents partent tous les deux', () => {
    const { instance, appels } = fausseInstance();
    installerDeduplication(instance);

    instance.post('/reserves', { titre: 'Fissure' });
    instance.post('/reserves', { titre: 'Carrelage' });

    expect(appels).toHaveLength(2);
  });

  it('deux URL différentes partent toutes les deux', () => {
    const { instance, appels } = fausseInstance();
    installerDeduplication(instance);

    instance.post('/chantiers/a/reserves', { titre: 'X' });
    instance.post('/chantiers/b/reserves', { titre: 'X' });

    expect(appels).toHaveLength(2);
  });

  it('une lecture n’est jamais déduplicée', () => {
    const { instance, appels } = fausseInstance();
    installerDeduplication(instance);

    instance.get('/chantiers');
    instance.get('/chantiers');

    expect(appels).toHaveLength(2);
  });
});

// ── 3. La fenêtre se referme ────────────────────────────────────────────────

describe('fin de la fenêtre', () => {
  it('après un SUCCÈS, un envoi identique repart', async () => {
    const { instance, appels, resolveurs } = fausseInstance();
    installerDeduplication(instance);

    const premier = instance.post('/reserves', { titre: 'Fissure' });
    resolveurs[0].resolve({ data: {} });
    await premier;

    instance.post('/reserves', { titre: 'Fissure' });
    expect(appels).toHaveLength(2);
  });

  it('après un ÉCHEC, un envoi identique repart — c’est le geste de l’utilisateur', async () => {
    const { instance, appels, resolveurs } = fausseInstance();
    installerDeduplication(instance);

    const premier = instance.post('/reserves', { titre: 'Fissure' });
    resolveurs[0].reject(new Error('réseau'));
    await expect(premier).rejects.toThrow('réseau');

    instance.post('/reserves', { titre: 'Fissure' });
    expect(appels).toHaveLength(2);
  });
});

// ── 4. Les dépôts de fichiers ───────────────────────────────────────────────

describe('FormData', () => {
  it('deux dépôts du même fichier simultanés ne partent qu’une fois', () => {
    const { instance, appels } = fausseInstance();
    installerDeduplication(instance);

    const fabriquer = () => {
      const fd = new FormData();
      fd.append('nom', 'Plan de masse');
      fd.append('fichier', new File(['%PDF'], 'masse.pdf', { type: 'application/pdf' }));
      return fd;
    };

    instance.post('/chantiers/c1/plans', fabriquer());
    instance.post('/chantiers/c1/plans', fabriquer());

    expect(appels).toHaveLength(1);
  });

  it('deux fichiers DIFFÉRENTS partent tous les deux', () => {
    const { instance, appels } = fausseInstance();
    installerDeduplication(instance);

    const avec = (nom) => {
      const fd = new FormData();
      fd.append('fichier', new File(['%PDF'], nom, { type: 'application/pdf' }));
      return fd;
    };

    instance.post('/chantiers/c1/plans', avec('a.pdf'));
    instance.post('/chantiers/c1/plans', avec('b.pdf'));

    expect(appels).toHaveLength(2);
  });
});

// ── 5. Le repli ─────────────────────────────────────────────────────────────

describe('corps indescriptible', () => {
  it('une structure cyclique part sans déduplication plutôt que d’échouer', () => {
    const { instance, appels } = fausseInstance();
    installerDeduplication(instance);

    const cyclique = { nom: 'x' };
    cyclique.soi = cyclique;

    instance.post('/x', cyclique);
    instance.post('/x', cyclique);

    // Mieux vaut un doublon rare qu'un envoi légitime bloqué par une clé
    // qu'on aurait mal calculée.
    expect(appels).toHaveLength(2);
  });
});
