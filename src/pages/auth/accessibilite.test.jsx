import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import Login from './Login.jsx';
import Register from './Register.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import ResetPassword from './ResetPassword.jsx';

/**
 * Les quatre écrans d'authentification, du point de vue d'un lecteur d'écran.
 *
 * ## Ce que ces tests verrouillent
 *
 * Un `<label>` sans `htmlFor` posé devant un `<input>` sans `id` n'est PAS un
 * libellé : visuellement il en a l'air, mais rien ne les relie. La synthèse
 * vocale annonce « zone de texte, vide » — l'utilisateur ne sait pas quoi
 * saisir — et un clic sur le texte ne place pas le curseur dans le champ.
 *
 * C'est la porte d'entrée du produit : personne ne peut se connecter en
 * contournant ces écrans. Une régression ici ferme l'application entière à une
 * partie des utilisateurs.
 *
 * `getByLabelText` est exactement le contrôle qu'il faut : il ne trouve un
 * champ QUE s'il est réellement accessible par son libellé — `htmlFor`/`id`,
 * `aria-label` ou `aria-labelledby`. Un test qui passe ici est un champ qu'un
 * lecteur d'écran sait nommer.
 *
 * WCAG 2.1 AA — 1.3.1 (Information et relations), 3.3.2 (Étiquettes),
 * 4.1.2 (Nom, rôle, valeur).
 */

vi.mock('../../service/auth/authService.js', () => ({
  login: vi.fn(),
  verifierMfa: vi.fn(),
  register: vi.fn(),
  validatePassword: vi.fn(() => true),
  validateIdentifiant: vi.fn(() => true),
}));

vi.mock('../../service/account/accountService.js', () => ({
  oublierMotDePasse: vi.fn(),
  reinitialiserMotDePasse: vi.fn(),
}));

vi.mock('../../hooks/usePays.js', () => ({
  usePays: () => ({
    pays: [{ code: 'SN', nom: 'Sénégal', champs: [{ nom: 'ninea', libelle: 'NINEA' }] }],
    chargement: false,
    erreur: null,
  }),
}));

vi.mock('../../context/useUser.js', () => ({
  useUser: () => ({ user: null, setUser: vi.fn(), clearUser: vi.fn(), pretAuthentification: true }),
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn(), confirm: vi.fn() },
}));

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

const afficher = (Ecran) => render(<MemoryRouter><Ecran /></MemoryRouter>);

// ── Chaque champ doit être atteignable PAR SON LIBELLÉ ──────────────────────

describe('Connexion', () => {
  it('nomme ses deux champs', () => {
    afficher(Login);

    // Le libellé réel est « Email ou téléphone » : on interroge par ce qui est
    // affiché, pas par le nom de la clé de traduction.
    expect(screen.getByLabelText(/Email ou téléphone/i)).toBeTruthy();
    expect(screen.getByLabelText(/Mot de passe/i)).toBeTruthy();
  });
});

describe('Mot de passe oublié', () => {
  it('nomme son champ e-mail', () => {
    afficher(ForgotPassword);

    expect(screen.getByLabelText(/E-mail|Email/i)).toBeTruthy();
  });
});

describe('Réinitialisation', () => {
  it('nomme ses quatre champs', () => {
    afficher(ResetPassword);

    expect(screen.getByLabelText(/E-mail|Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/[Cc]ode/i)).toBeTruthy();
    expect(screen.getByLabelText(/Nouveau mot de passe/i)).toBeTruthy();
    expect(screen.getByLabelText(/Confirmer/i)).toBeTruthy();
  });
});

describe('Inscription', () => {
  it('nomme le mot de passe, sa confirmation et le pays', () => {
    afficher(Register);

    expect(screen.getByLabelText(/^Mot de passe/i)).toBeTruthy();
    expect(screen.getByLabelText(/Confirmer/i)).toBeTruthy();
    expect(screen.getByLabelText(/Pays/i)).toBeTruthy();
  });

  it('nomme AUSSI les champs générés par liste (nom, prénom, e-mail…)', () => {
    afficher(Register);

    // Ces champs sont produits par un `map` : c'est le cas où l'oubli passe le
    // plus facilement inaperçu, puisqu'un seul libellé mal relié en casse
    // autant qu'il y a d'entrées dans la liste.
    const champs = screen.getAllByLabelText(/.+/);
    const sansNom = champs.filter((el) => !el.getAttribute('id') && !el.getAttribute('aria-label'));
    expect(sansNom).toEqual([]);
  });
});

// ── Aucun champ orphelin sur l'ensemble des écrans ──────────────────────────

describe('aucun champ orphelin', () => {
  it.each([
    ['Connexion', Login],
    ['Mot de passe oublié', ForgotPassword],
    ['Réinitialisation', ResetPassword],
    ['Inscription', Register],
  ])('%s : chaque saisie porte un identifiant ou un nom accessible', (_nom, Ecran) => {
    const { container } = afficher(Ecran);

    // Les cases à cocher de consentement portent leur libellé autrement (texte
    // adjacent enveloppé) ; les champs cachés n'ont pas de libellé à porter.
    const saisies = [...container.querySelectorAll('input, select, textarea')]
      .filter((el) => el.type !== 'hidden' && el.type !== 'checkbox');

    const orphelines = saisies.filter(
      (el) => !el.id && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'),
    );

    expect(orphelines.map((el) => el.name || el.type)).toEqual([]);
  });
});
