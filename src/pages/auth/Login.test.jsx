import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import Login from './Login.jsx';
import { login, verifierMfa } from '../../service/auth/authService.js';
import { getStatus } from '../../service/subscription/subscriptionService.js';

/**
 * Le parcours de connexion — le seul dont l'échec ferme l'application entière.
 *
 * ## Pourquoi ces tests existent
 *
 * Cet écran n'avait AUCUN test fonctionnel. Il porte pourtant quatre décisions
 * dont chacune, prise à l'envers, produit un incident :
 *
 *   1. la double authentification est un ÉTAT INTERMÉDIAIRE — tant que le code
 *      n'est pas validé, aucun utilisateur ne doit être posé en session ;
 *   2. le portail d'arrivée dépend du RÔLE : une entreprise atterrit sur ses
 *      chantiers, un chef de projet sur son tableau de bord, le super-admin
 *      plateforme sur son espace ;
 *   3. un échec de connexion ne doit RIEN poser en session ;
 *   4. l'avertissement de fin d'essai ne doit jamais bloquer une connexion
 *      valide — c'est une information, pas une porte.
 *
 * ## Ce qui n'est pas testé ici
 *
 * Le renouvellement silencieux de session vit dans l'intercepteur axios : sa
 * règle de décision est extraite et testée à part (`service/api.test.js`).
 */

vi.mock('../../service/auth/authService.js', () => ({
  login: vi.fn(),
  verifierMfa: vi.fn(),
  validateLoginForm: (identifiant, motDePasse) => {
    const errs = {};
    if (!identifiant?.trim()) errs.identifiant = 'Identifiant requis';
    if (!motDePasse) errs.motDePasse = 'Mot de passe requis';
    return errs;
  },
}));

vi.mock('../../service/subscription/subscriptionService.js', () => ({
  getStatus: vi.fn(),
}));

// `vi.hoisted` : les fabriques de `vi.mock` sont remontées en tête de fichier
// et ne peuvent pas lire une variable déclarée plus bas. C'est le mécanisme
// prévu pour partager un espion entre la fabrique et les tests.
const { swal, setUser, navigate } = vi.hoisted(() => ({
  swal: { error: vi.fn(), success: vi.fn(), info: vi.fn(), confirm: vi.fn() },
  setUser: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../../utils/swal.config.js', () => ({ default: swal }));

vi.mock('../../context/useUser.js', () => ({
  useUser: () => ({ user: null, setUser, clearUser: vi.fn(), pretAuthentification: true }),
}));

vi.mock('react-router-dom', async (original) => ({
  ...(await original()),
  useNavigate: () => navigate,
}));

const ENTREPRISE = { id: 'u1', prenom: 'Balla', nom: 'Beye', role: 'Entreprise' };

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

beforeEach(() => {
  vi.clearAllMocks();
  getStatus.mockResolvedValue({ isSubscribed: true });
});

const afficher = () => render(<MemoryRouter><Login /></MemoryRouter>);

const remplir = (identifiant = 'balla@widjila.com', motDePasse = 'Motdepasse1!') => {
  fireEvent.change(screen.getByLabelText(/Email ou téléphone/i), { target: { value: identifiant } });
  fireEvent.change(screen.getByLabelText(/Mot de passe/i), { target: { value: motDePasse } });
};

const soumettre = () => fireEvent.click(screen.getByRole('button', { name: /Se connecter|Connexion/i }));

// ── 1. Le cas nominal ───────────────────────────────────────────────────────

describe('connexion réussie', () => {
  it('pose l’utilisateur en session et l’emmène au portail de SON rôle', async () => {
    login.mockResolvedValue({ mfaRequise: false, utilisateur: ENTREPRISE });

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(setUser).toHaveBeenCalledWith(ENTREPRISE));
    // Une entreprise arrive sur ses chantiers, pas sur le tableau de bord.
    expect(navigate).toHaveBeenCalledWith('/chantiers', { replace: true });
  });

  it('envoie un chef de projet sur le tableau de bord', async () => {
    login.mockResolvedValue({ mfaRequise: false, utilisateur: { ...ENTREPRISE, role: 'ChefProjet' } });

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  });

  it('envoie le super-admin sur l’espace plateforme, pas sur un tableau de bord vide', async () => {
    // Il n'appartient à aucune organisation : le tableau de bord métier
    // l'interrogerait avec `organisationId = null` et lui servirait un écran vide.
    login.mockResolvedValue({ mfaRequise: false, utilisateur: { ...ENTREPRISE, role: 'Admin' } });

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/plateforme', { replace: true }));
  });
});

// ── 2. La double authentification ───────────────────────────────────────────

describe('double authentification', () => {
  it('n’ouvre AUCUNE session tant que le code n’est pas validé', async () => {
    login.mockResolvedValue({ mfaRequise: true, utilisateur: ENTREPRISE });

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(login).toHaveBeenCalled());
    // C'est le point le plus important de cet écran : la première étape
    // authentifie le mot de passe, pas l'utilisateur.
    expect(setUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('affiche la saisie du code à six chiffres', async () => {
    login.mockResolvedValue({ mfaRequise: true, utilisateur: ENTREPRISE });

    afficher();
    remplir();
    soumettre();

    const chiffres = await screen.findAllByLabelText(/[Cc]hiffre/);
    expect(chiffres).toHaveLength(6);
  });

  it('ouvre la session une fois le code accepté', async () => {
    login.mockResolvedValue({ mfaRequise: true, utilisateur: ENTREPRISE });
    verifierMfa.mockResolvedValue({ utilisateur: ENTREPRISE });

    afficher();
    remplir();
    soumettre();

    const chiffres = await screen.findAllByLabelText(/[Cc]hiffre/);
    '123456'.split('').forEach((d, i) => {
      fireEvent.change(chiffres[i], { target: { value: d } });
    });

    fireEvent.click(screen.getByRole('button', { name: /Vérifier|Valider|Confirmer/i }));

    await waitFor(() => expect(verifierMfa).toHaveBeenCalledWith({ code: '123456' }));
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(ENTREPRISE));
  });

  it('un code refusé laisse la session fermée', async () => {
    login.mockResolvedValue({ mfaRequise: true, utilisateur: ENTREPRISE });
    verifierMfa.mockRejectedValue({ response: { status: 401, data: { message: 'Code invalide' } } });

    afficher();
    remplir();
    soumettre();

    const chiffres = await screen.findAllByLabelText(/[Cc]hiffre/);
    '000000'.split('').forEach((d, i) => {
      fireEvent.change(chiffres[i], { target: { value: d } });
    });
    fireEvent.click(screen.getByRole('button', { name: /Vérifier|Valider|Confirmer/i }));

    await waitFor(() => expect(swal.error).toHaveBeenCalled());
    expect(setUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

// ── 3. Les échecs ───────────────────────────────────────────────────────────

describe('connexion refusée', () => {
  it('ne pose rien en session et ne navigue nulle part', async () => {
    login.mockRejectedValue({ response: { status: 401, data: { message: 'Identifiants incorrects' } } });

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(swal.error).toHaveBeenCalled());
    expect(setUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('relaie le message du SERVEUR, pas un texte générique', async () => {
    login.mockRejectedValue({ response: { status: 403, data: { message: 'Votre compte est désactivé.' } } });

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(swal.error).toHaveBeenCalled());
    // « Votre compte est désactivé » et « Identifiants incorrects » appellent
    // des gestes opposés : écraser le message du serveur les rendrait
    // indiscernables.
    const argument = swal.error.mock.calls.at(-1)[0];
    expect(argument.text).toBe('Votre compte est désactivé.');
  });

  it('n’appelle pas le serveur si le formulaire est vide', () => {
    afficher();
    soumettre();

    expect(login).not.toHaveBeenCalled();
  });
});

// ── 4. L'avertissement de fin d'essai ───────────────────────────────────────

describe('fin d’essai proche', () => {
  it('avertit sans bloquer : refuser mène quand même au portail', async () => {
    login.mockResolvedValue({ mfaRequise: false, utilisateur: ENTREPRISE });
    getStatus.mockResolvedValue({
      isSubscribed: false, trialEnded: false, joursRestantsTrial: 2, trialEndsAt: '2026-09-12',
    });
    swal.confirm.mockResolvedValue(false);   // « plus tard »

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(swal.confirm).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/chantiers', { replace: true });
  });

  it('accepter mène à l’écran d’abonnement', async () => {
    login.mockResolvedValue({ mfaRequise: false, utilisateur: ENTREPRISE });
    getStatus.mockResolvedValue({
      isSubscribed: false, trialEnded: false, joursRestantsTrial: 1, trialEndsAt: '2026-09-11',
    });
    swal.confirm.mockResolvedValue(true);

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/abonnement', { replace: true }));
  });

  it('« Voir les formules » n’est pas aussitôt écrasé par le portail', async () => {
    // La navigation vers `/abonnement` était suivie, dans la même
    // milliseconde, de celle vers le portail : le bouton ne menait nulle part.
    login.mockResolvedValue({ mfaRequise: false, utilisateur: ENTREPRISE });
    getStatus.mockResolvedValue({
      isSubscribed: false, trialEnded: false, joursRestantsTrial: 1, trialEndsAt: '2026-09-11',
    });
    swal.confirm.mockResolvedValue(true);

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/abonnement', { replace: true }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('un échec de la vérification d’abonnement ne bloque pas la connexion', async () => {
    login.mockResolvedValue({ mfaRequise: false, utilisateur: ENTREPRISE });
    getStatus.mockRejectedValue(new Error('réseau'));

    afficher();
    remplir();
    soumettre();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/chantiers', { replace: true }));
  });
});

// ── 5. Le retour à la page qui a demandé la connexion ──────────────────────

describe('retour après connexion', () => {
  const afficherAvecRetour = (retour) => render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: { retour } }]}>
      <Login />
    </MemoryRouter>,
  );

  it('ramène à l’abonnement, formule choisie comprise', async () => {
    // Le visiteur a cliqué « Se connecter pour choisir » sur une formule : le
    // renvoyer sur son portail lui ferait tout recommencer.
    login.mockResolvedValue({ mfaRequise: false, utilisateur: ENTREPRISE });

    afficherAvecRetour('/abonnement?plan=pro');
    remplir();
    soumettre();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/abonnement?plan=pro', { replace: true }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it.each(['//site-tiers.example', '/\\site-tiers.example', 'https://site-tiers.example'])(
    'ignore un retour hors de l’application (%s)',
    async (retour) => {
      login.mockResolvedValue({ mfaRequise: false, utilisateur: ENTREPRISE });

      afficherAvecRetour(retour);
      remplir();
      soumettre();

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/chantiers', { replace: true }));
    },
  );
});
