import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import api, {
  setStoredToken, clearStoredToken, avecVerrouRefresh, annoncerFinDeSession, ecouterFinDeSession,
} from './api.js';

/**
 * L'intercepteur de requêtes — en conditions réelles, sans réseau.
 *
 * On remplace l'ADAPTATEUR d'axios (la couche qui envoie vraiment la requête)
 * par un espion : tout le reste — intercepteurs, fusion de configuration,
 * résolution de `baseURL` — tourne exactement comme en production. C'est ce
 * qui distingue ces tests de ceux de `securite.test.js`, qui testent les
 * règles isolément : ici on vérifie qu'elles sont BRANCHÉES.
 */

/** Dernière configuration arrivée jusqu'à l'envoi — `null` si rien n'est parti. */
let envoyee = null;
const adaptateurOrigine = api.defaults.adapter;

/** En-tête Authorization tel qu'il serait parti. */
const autorisation = () => {
  const entetes = envoyee?.headers;
  return entetes?.get?.('Authorization') ?? entetes?.Authorization;
};

beforeEach(() => {
  envoyee = null;
  api.defaults.adapter = async (config) => {
    envoyee = config;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
  setStoredToken('jeton-de-test');
});

afterEach(() => {
  api.defaults.adapter = adaptateurOrigine;
  clearStoredToken();
});

// ── Le jeton ────────────────────────────────────────────────────────────────

describe('jeton de session', () => {
  it('est joint à une requête vers l’API', async () => {
    await api.get('/chantiers');
    expect(autorisation()).toBe('Bearer jeton-de-test');
  });

  it('N’EST PAS joint à une URL absolue d’un autre domaine', async () => {
    // Le défaut d'origine : axios ignore `baseURL` pour une URL absolue, et
    // l'intercepteur joignait quand même la session — elle partait chez le tiers.
    await api.get('https://stockage.example.com/plans/a.pdf');
    expect(envoyee).not.toBeNull();
    expect(autorisation()).toBeUndefined();
  });

  it('n’est pas joint non plus à une URL « //hôte »', async () => {
    await api.get('//stockage.example.com/a.pdf');
    expect(autorisation()).toBeUndefined();
  });

  it('aucun jeton en mémoire : aucun en-tête', async () => {
    clearStoredToken();
    await api.get('/chantiers');
    expect(autorisation()).toBeUndefined();
  });
});

// ── Les chemins ─────────────────────────────────────────────────────────────

describe('traversée de chemin', () => {
  it('refuse AVANT l’envoi un chemin qui remonte d’un cran', async () => {
    // Ce que produit un lien piégé `/chantiers/..%2Forganisation%2Fmembres%2F1`
    // une fois décodé par React Router puis interpolé par le service.
    const erreur = await api.get('/chantiers/../organisation/membres/1').catch((e) => e);

    expect(erreur.code).toBe('CHEMIN_REFUSE');
    expect(envoyee).toBeNull();   // rien n'est parti
  });

  it('refuse aussi une écriture — c’est là que la traversée coûte', async () => {
    const erreur = await api.delete('/chantiers/..%2F..%2Forganisation%2Fmembres%2F1').catch((e) => e);

    expect(erreur.code).toBe('CHEMIN_REFUSE');
    expect(envoyee).toBeNull();
  });

  it('laisse passer une recherche qui contient « ../ » en paramètre', async () => {
    await api.get('/reserves', { params: { search: '../' } });
    expect(envoyee).not.toBeNull();
  });
});

// ── Le verrou de renouvellement ─────────────────────────────────────────────

describe('avecVerrouRefresh', () => {
  it('exécute la tâche et rend son résultat, même sans API Web Locks', async () => {
    expect(await avecVerrouRefresh(async () => 42)).toBe(42);
  });

  it('sérialise deux renouvellements quand l’API Web Locks existe', async () => {
    const ordre = [];
    // Verrou minimal, fidèle à la sémantique de `navigator.locks.request` :
    // une tâche attend la fin de la précédente.
    let file = Promise.resolve();
    const locksOrigine = navigator.locks;
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (_nom, tache) => {
          const suite = file.then(() => tache());
          file = suite.catch(() => {});
          return suite;
        },
      },
    });

    const lent = avecVerrouRefresh(async () => {
      ordre.push('A:début');
      await new Promise((r) => setTimeout(r, 20));
      ordre.push('A:fin');
    });
    const rapide = avecVerrouRefresh(async () => { ordre.push('B'); });
    await Promise.all([lent, rapide]);

    // B ne démarre qu'une fois A terminé : il part avec le cookie renouvelé.
    expect(ordre).toEqual(['A:début', 'A:fin', 'B']);

    Object.defineProperty(navigator, 'locks', { configurable: true, value: locksOrigine });
  });
});

// ── La fin de session, annoncée à tous les onglets ──────────────────────────
//
// Avant : « Se déconnecter » révoquait le cookie partagé mais laissait les
// autres onglets ouverts, avec un jeton d'accès valide encore une heure. Sur
// un poste partagé de chantier, la personne suivante trouvait une session
// ouverte dans l'onglet d'à côté.

describe('fin de session entre onglets', () => {
  it('la déconnexion est annoncée aux autres onglets', async () => {
    const autreOnglet = new BroadcastChannel('sc-session');
    const recu = new Promise((resoudre) => { autreOnglet.onmessage = (e) => resoudre(e.data); });

    annoncerFinDeSession();

    expect(await recu).toEqual({ type: 'fin-session' });
    autreOnglet.close();
  });

  it('un onglet ferme sa session quand un autre l’annonce', async () => {
    const rappel = vi.fn();
    const desabonner = ecouterFinDeSession(rappel);
    const autreOnglet = new BroadcastChannel('sc-session');

    autreOnglet.postMessage({ type: 'fin-session' });

    await vi.waitFor(() => expect(rappel).toHaveBeenCalledTimes(1));
    desabonner();
    autreOnglet.close();
  });

  it('ignore tout autre message sur le canal', async () => {
    const rappel = vi.fn();
    const desabonner = ecouterFinDeSession(rappel);
    const autreOnglet = new BroadcastChannel('sc-session');

    autreOnglet.postMessage({ type: 'autre-chose' });
    await new Promise((r) => setTimeout(r, 30));

    expect(rappel).not.toHaveBeenCalled();
    desabonner();
    autreOnglet.close();
  });
});
