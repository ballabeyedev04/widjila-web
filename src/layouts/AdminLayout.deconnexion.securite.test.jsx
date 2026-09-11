import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../i18n/index.js';
import AdminLayout from './AdminLayout.jsx';
import { useUser } from '../context/useUser.js';
import { logout } from '../service/auth/authService.js';
import SwalCustom from '../utils/swal.config.js';

/**
 * Déconnexion — rien de la session précédente ne survit dans l'onglet.
 *
 * La déconnexion naviguait vers /login SANS recharger la page. Tout ce que
 * les modules gardent en mémoire pour la session restait donc en place :
 * phases et corps d'état de l'organisation (`usePhasesActives`,
 * `useCorpsEtatActifs`), vignettes de plans, état d'abonnement. Sur un poste
 * partagé, la personne suivante qui se connectait dans le même onglet voyait
 * d'abord les référentiels de l'organisation précédente.
 *
 * Un rechargement complet (`location.replace`) est la seule purge qui ne
 * dépende d'aucune liste de caches à tenir à jour.
 */

vi.mock('../context/useUser.js', () => ({ useUser: vi.fn() }));
vi.mock('../context/SubscriptionContext.jsx', () => ({
  useSubscription: () => ({ status: null }),
  getTrialDisplayInfo: () => null,
}));
vi.mock('../service/notification/notificationService.js', () => ({
  compterNonLues: vi.fn().mockResolvedValue(0),
}));
vi.mock('../service/auth/authService.js', () => ({ logout: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../service/admin/adminService.js', () => ({
  compterDemandesEnAttente: vi.fn().mockResolvedValue(0),
  compterSuppressionsEnAttente: vi.fn().mockResolvedValue(0),
}));
vi.mock('../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), confirm: vi.fn() },
}));

const locationOrigine = window.location;
let replace;

describe('déconnexion depuis le layout', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    replace = vi.fn();
    // jsdom n'implémente pas la navigation : on observe l'appel.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...locationOrigine, pathname: '/dashboard', replace },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: locationOrigine });
  });

  const afficher = (clearUser = vi.fn()) => {
    useUser.mockReturnValue({
      user: { id: 'u1', nom: 'Sow', prenom: 'Awa', role: 'ChefProjet', email: 'a@b.fr' },
      clearUser,
    });
    render(<MemoryRouter><AdminLayout /></MemoryRouter>);
    return clearUser;
  };

  it('révoque la session, vide l’état et RECHARGE la page sur /login', async () => {
    SwalCustom.confirm.mockResolvedValue(true);
    const clearUser = afficher();

    fireEvent.click(await screen.findByRole('button', { name: /Déconnexion/ }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(logout).toHaveBeenCalled();
    expect(clearUser).toHaveBeenCalled();
  });

  it('ne fait rien si l’utilisateur annule', async () => {
    SwalCustom.confirm.mockResolvedValue(false);
    afficher();

    fireEvent.click(await screen.findByRole('button', { name: /Déconnexion/ }));

    await waitFor(() => expect(SwalCustom.confirm).toHaveBeenCalled());
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
