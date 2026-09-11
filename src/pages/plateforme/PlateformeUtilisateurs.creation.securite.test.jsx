import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../i18n/index.js';

import PlateformeUtilisateurs from './PlateformeUtilisateurs.jsx';
import {
  listerUtilisateurs, listerOrganisations, creerUtilisateurAdmin,
} from '../../service/admin/adminService.js';
import { useUser } from '../../context/useUser.js';

/**
 * Création d'un compte par le super-admin — le mot de passe saisi doit
 * ARRIVER au serveur.
 *
 * L'écran l'envoyait sous la clé `motDePasse` ; le schéma du serveur attend
 * `mot_de_passe` et retire toute clé inconnue. La saisie disparaissait donc
 * en silence, et le serveur retombait sur un mot de passe codé en dur,
 * identique pour TOUS les comptes créés ici — `Admin` compris. Le serveur ne
 * connaît plus de mot de passe par défaut (voir
 * backend/src/__tests__/admin.gestionUtilisateur.securite.test.js) ; ce test
 * fige l'autre moitié : la clé envoyée par l'écran.
 */

vi.mock('../../service/admin/adminService.js', () => ({
  listerUtilisateurs: vi.fn(),
  listerOrganisations: vi.fn(),
  creerUtilisateurAdmin: vi.fn(),
  modifierUtilisateurAdmin: vi.fn(),
  changerRoleUtilisateur: vi.fn(),
  supprimerUtilisateurAdmin: vi.fn(),
}));

vi.mock('../../context/useUser.js', () => ({ useUser: vi.fn() }));

vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), confirm: vi.fn(() => Promise.resolve(true)) },
}));

describe('PlateformeUtilisateurs — création', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    useUser.mockReturnValue({ user: { id: 'u-admin', role: 'Admin' } });
    listerOrganisations.mockResolvedValue({ items: [], total: 0 });
    listerUtilisateurs.mockResolvedValue({ items: [], total: 0 });
    creerUtilisateurAdmin.mockResolvedValue({});
  });

  it('envoie le mot de passe saisi sous la clé du serveur, `mot_de_passe`', async () => {
    render(<PlateformeUtilisateurs />);

    fireEvent.click(await screen.findByRole('button', { name: /Créer un utilisateur/ }));
    fireEvent.change(await screen.findByLabelText(/^Nom/), { target: { value: 'Diop' } });
    fireEvent.change(screen.getByLabelText(/^Prénom/), { target: { value: 'Awa' } });
    fireEvent.change(screen.getByLabelText(/mail/i), { target: { value: 'awa@client.sn' } });
    fireEvent.change(screen.getByLabelText(/^Identifiant/), { target: { value: 'awa@client.sn' } });
    fireEvent.change(screen.getByLabelText(/^Mot de passe initial/), { target: { value: 'Choisi#2026x' } });
    fireEvent.click(screen.getByRole('button', { name: /^Créer$/ }));

    await waitFor(() => expect(creerUtilisateurAdmin).toHaveBeenCalled());
    const [payload] = creerUtilisateurAdmin.mock.calls[0];
    expect(payload.mot_de_passe).toBe('Choisi#2026x');
    // Les clés que le serveur ignore ne partent plus : la saisie ne peut plus
    // disparaître sans que personne ne le voie.
    expect(payload).not.toHaveProperty('motDePasse');
    expect(payload).not.toHaveProperty('identifiant');
  });
});
