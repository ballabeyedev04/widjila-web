import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

/**
 * Tests — échange du code de transfert que le mobile glisse dans l'adresse.
 *
 * Le bouton « Choisir cette formule » du mobile ouvre `/abonnement` dans le
 * navigateur du téléphone, avec `#transfert=<code>`. Ce navigateur n'a pas de
 * session : sans cet échange, la page tombait sur des 401 puis renvoyait vers
 * la connexion.
 *
 * Le code ouvre une session : il ne doit survivre ni dans l'adresse, ni être
 * présenté deux fois. C'est ce que ces tests verrouillent.
 *
 * `vi.resetModules()` à chaque test : l'échange est mémorisé au niveau du
 * module — un par chargement de page, justement.
 */

const UTILISATEUR = { id: 'u1', prenom: 'Balla', nom: 'Beye', role: 'Entreprise' };

const charger = async () => import('./api.js');

// Premier import préchauffé hors des tests : sa transformation dépasse
// parfois le délai d'un test. Un test expiré continue alors de s'exécuter et
// consomme le fragment posé par le test SUIVANT — deux échecs pour un seul
// import lent.
beforeAll(async () => { await charger(); }, 60_000);

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('arrivée depuis le mobile', () => {
  it('échange le code, pose la session et EFFACE le code de l’adresse', async () => {
    window.history.replaceState(null, '', '/abonnement?plan=pro#transfert=code-123');
    const api = await charger();
    const post = vi.spyOn(api.default, 'post').mockResolvedValue({
      data: { success: true, data: { token: 'jeton-acces', utilisateur: UTILISATEUR } },
    });

    const resultat = await api.consommerTransfertWeb();

    expect(post).toHaveBeenCalledWith('/auth/transfert-web/echange', { code: 'code-123' });
    expect(resultat).toEqual({ utilisateur: UTILISATEUR });
    expect(api.getStoredToken()).toBe('jeton-acces');
    expect(api.getUser()).toEqual(UTILISATEUR);
    // Le code est parti de l'adresse ; la formule demandée, elle, est restée.
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe('?plan=pro');
  });

  it('ne présente le code qu’UNE fois, même appelé deux fois (mode strict de React)', async () => {
    window.history.replaceState(null, '', '/abonnement#transfert=code-123');
    const api = await charger();
    const post = vi.spyOn(api.default, 'post').mockResolvedValue({
      data: { data: { token: 'jeton-acces', utilisateur: UTILISATEUR } },
    });

    const [premier, second] = await Promise.all([api.consommerTransfertWeb(), api.consommerTransfertWeb()]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(second).toBe(premier);
  });

  it('un code refusé ne pose aucune session, et le signale', async () => {
    window.history.replaceState(null, '', '/abonnement#transfert=code-perime');
    const api = await charger();
    vi.spyOn(api.default, 'post').mockRejectedValue({ response: { status: 400 } });

    const resultat = await api.consommerTransfertWeb();

    expect(resultat).toEqual({ echec: true });
    expect(api.getStoredToken()).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('garde le reste du fragment intact', async () => {
    window.history.replaceState(null, '', '/abonnement#transfert=code-123&onglet=offres');
    const api = await charger();
    vi.spyOn(api.default, 'post').mockResolvedValue({
      data: { data: { token: 'jeton-acces', utilisateur: UTILISATEUR } },
    });

    await api.consommerTransfertWeb();

    expect(window.location.hash).toBe('#onglet=offres');
  });
});

describe('arrivée ordinaire', () => {
  it('sans code dans l’adresse : aucun appel, aucune session touchée', async () => {
    window.history.replaceState(null, '', '/abonnement');
    const api = await charger();
    const post = vi.spyOn(api.default, 'post');

    const resultat = await api.consommerTransfertWeb();

    expect(resultat).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});
