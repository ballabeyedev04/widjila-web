import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../i18n/index.js';

import PlateformeUtilisateurs from './PlateformeUtilisateurs.jsx';
import {
  listerUtilisateurs, listerOrganisations, modifierUtilisateurAdmin,
  changerRoleUtilisateur, supprimerUtilisateurAdmin,
} from '../../service/admin/adminService.js';
import { useUser } from '../../context/useUser.js';

/**
 * Gestion des comptes par le super-admin.
 *
 * Deux garde-fous que ces tests figent, tous deux imposés par le serveur :
 *
 *   - un admin ne peut ni changer SON rôle ni supprimer SON compte
 *     (`gestionUtilisateur.service.js`). L'écran le proposait quand même :
 *     une confirmation rouge s'ouvrait pour une action vouée au refus ;
 *   - `modifierUtilisateur` ne recopie PAS le champ `role`. Le formulaire
 *     d'édition en montrait pourtant un, puis annonçait « Utilisateur mis à
 *     jour » — un succès affiché pour une modification qui n'avait pas lieu.
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
  default: {
    error: vi.fn(), success: vi.fn(), toast: vi.fn(),
    confirm: vi.fn(() => Promise.resolve(true)),
  },
}));

const MOI = {
  id: 'u-admin',
  prenom: 'Awa',
  nom: 'Sow',
  email: 'awa@exemple.test',
  role: 'Admin',
  statut: 'actif',
  createdAt: '2026-01-05T08:00:00.000Z',
};

const AUTRE = {
  id: 'u-autre',
  prenom: 'Ibrahima',
  nom: 'Ba',
  email: 'ibrahima@exemple.test',
  role: 'Entreprise',
  statut: 'actif',
  createdAt: '2026-02-10T08:00:00.000Z',
};

/** La cellule d'actions d'une ligne, désignée par la personne qu'elle concerne. */
const ligneDe = (personne) =>
  screen.getByText(personne.email).closest('tr');

describe('PlateformeUtilisateurs', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    useUser.mockReturnValue({ user: MOI });
    listerOrganisations.mockResolvedValue({ items: [], total: 0 });
    listerUtilisateurs.mockResolvedValue({ items: [MOI, AUTRE], total: 2 });
  });

  it('liste les comptes de la plateforme', async () => {
    render(<PlateformeUtilisateurs />);

    expect(await screen.findByText('awa@exemple.test')).toBeTruthy();
    expect(screen.getByText('ibrahima@exemple.test')).toBeTruthy();
  });

  describe('son propre compte', () => {
    it('n’offre pas de changer son propre rôle', async () => {
      render(<PlateformeUtilisateurs />);

      await screen.findByText('awa@exemple.test');
      const moi = ligneDe(MOI);

      expect(moi.querySelector('select')).toBeNull();
      expect(moi.textContent).toContain('Votre compte');
      // Et le contrôle existe bien pour les AUTRES : l'absence ci-dessus est
      // une décision, pas un rendu qui a échoué.
      expect(ligneDe(AUTRE).querySelector('select')).toBeTruthy();
    });

    it('n’offre pas de supprimer son propre compte', async () => {
      render(<PlateformeUtilisateurs />);

      await screen.findByText('awa@exemple.test');

      // Une ligne d'un autre porte deux boutons (modifier, supprimer) ;
      // la sienne n'en porte qu'un.
      expect(ligneDe(MOI).querySelectorAll('button')).toHaveLength(1);
      expect(ligneDe(AUTRE).querySelectorAll('button')).toHaveLength(2);
    });

    it('laisse modifier ses propres coordonnées — le serveur l’accepte', async () => {
      render(<PlateformeUtilisateurs />);

      await screen.findByText('awa@exemple.test');
      fireEvent.click(ligneDe(MOI).querySelector('button'));

      expect(await screen.findByDisplayValue('awa@exemple.test')).toBeTruthy();
    });
  });

  describe('changement de rôle', () => {
    it('passe par la route dédiée, pas par le formulaire d’édition', async () => {
      changerRoleUtilisateur.mockResolvedValue({});
      render(<PlateformeUtilisateurs />);

      await screen.findByText('ibrahima@exemple.test');
      const select = ligneDe(AUTRE).querySelector('select');
      const cible = [...select.options].map((o) => o.value).find(Boolean);
      fireEvent.change(select, { target: { value: cible } });

      await waitFor(() => expect(changerRoleUtilisateur).toHaveBeenCalledWith('u-autre', cible));
    });

    it('n’envoie plus de `role` en édition — le serveur l’ignore', async () => {
      // Le champ était présent, parti dans la requête, et silencieusement
      // écarté par la liste blanche du service. L'admin lisait « mis à jour ».
      modifierUtilisateurAdmin.mockResolvedValue({});
      render(<PlateformeUtilisateurs />);

      await screen.findByText('ibrahima@exemple.test');
      fireEvent.click(ligneDe(AUTRE).querySelector('button'));
      await screen.findByDisplayValue('ibrahima@exemple.test');
      fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));

      await waitFor(() => expect(modifierUtilisateurAdmin).toHaveBeenCalled());
      const [, payload] = modifierUtilisateurAdmin.mock.calls[0];
      expect(payload).not.toHaveProperty('role');
      // Le statut, lui, EST recopié par le serveur : il doit continuer à partir.
      expect(payload).toHaveProperty('statut');
    });
  });

  it('supprime un autre compte après confirmation', async () => {
    supprimerUtilisateurAdmin.mockResolvedValue({});
    render(<PlateformeUtilisateurs />);

    await screen.findByText('ibrahima@exemple.test');
    const boutons = ligneDe(AUTRE).querySelectorAll('button');
    fireEvent.click(boutons[boutons.length - 1]);

    await waitFor(() => expect(supprimerUtilisateurAdmin).toHaveBeenCalledWith('u-autre'));
  });

  it('distingue un accès refusé d’une liste vide', async () => {
    const err = new Error('interdit');
    err.response = { status: 403, data: { message: 'Réservé au super-admin.' } };
    listerUtilisateurs.mockRejectedValue(err);

    render(<PlateformeUtilisateurs />);

    expect(await screen.findByText(/Accès refusé/)).toBeTruthy();
  });
});
