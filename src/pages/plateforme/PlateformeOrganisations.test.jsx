import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../i18n/index.js';

import PlateformeOrganisations from './PlateformeOrganisations.jsx';
import { listerOrganisations, modifierOrganisationAdmin } from '../../service/admin/adminService.js';
import { listerPlansAbonnement } from '../../service/abonnement/planAbonnementService.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Organisations de la plateforme — consultation et suspension, rien d'autre.
 *
 * Ce que ces tests tiennent :
 *
 *   - SUSPENDRE coupe l'accès de TOUS les comptes d'un client d'un coup : ce
 *     geste passe par une confirmation. Réactiver ne fait que rendre ce qui
 *     avait été retiré, et n'en demande pas ;
 *   - aucun bouton de création. Une organisation naît d'une inscription
 *     validée ; en créer une à la main produirait une coquille sans compte
 *     propriétaire ;
 *   - la panne du catalogue des formules ne doit pas empêcher de consulter
 *     les organisations — c'est un menu déroulant secondaire.
 */

vi.mock('../../service/admin/adminService.js', () => ({
  listerOrganisations: vi.fn(),
  modifierOrganisationAdmin: vi.fn(),
}));

vi.mock('../../service/abonnement/planAbonnementService.js', () => ({
  listerPlansAbonnement: vi.fn(),
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: {
    error: vi.fn(), success: vi.fn(), toast: vi.fn(),
    confirm: vi.fn(() => Promise.resolve(true)),
  },
}));

const ACTIVE = {
  id: 'org-1',
  nom: 'Sen BTP',
  email: 'contact@senbtp.test',
  statut: 'active',
  abonnement: 'pro',
  createdAt: '2026-03-01T09:00:00.000Z',
};

const SUSPENDUE = { ...ACTIVE, id: 'org-2', nom: 'Delta Construction', statut: 'suspendue' };

const ligneDe = (org) => screen.getByText(org.nom).closest('tr');
const bouton = (org, libelle) =>
  [...ligneDe(org).querySelectorAll('button')].find(
    (b) => (b.getAttribute('aria-label') || '').match(libelle)
  );

describe('PlateformeOrganisations', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    SwalCustom.confirm.mockResolvedValue(true);
    listerPlansAbonnement.mockResolvedValue({ plans: [{ code: 'pro', nom: 'Pro' }] });
    listerOrganisations.mockResolvedValue({ items: [ACTIVE, SUSPENDUE], total: 2 });
  });

  it('liste les organisations avec leur formule', async () => {
    render(<PlateformeOrganisations />);

    expect(await screen.findByText('Sen BTP')).toBeTruthy();
    // Le nom commercial, pas le code stocke : la pastille de la ligne.
    expect(ligneDe(ACTIVE).textContent).toContain('Pro');
  });

  it('n’offre PAS de créer une organisation', async () => {
    // Une organisation naît d'une inscription validée. Un bouton ici
    // produirait une coquille que personne ne pourrait réclamer.
    render(<PlateformeOrganisations />);

    await screen.findByText('Sen BTP');
    expect(screen.queryByRole('button', { name: /Nouvelle|Créer|Ajouter/ })).toBeNull();
  });

  it('demande confirmation avant de suspendre', async () => {
    modifierOrganisationAdmin.mockResolvedValue({});
    render(<PlateformeOrganisations />);

    await screen.findByText('Sen BTP');
    fireEvent.click(bouton(ACTIVE, /Suspendre/i));

    await waitFor(() => expect(SwalCustom.confirm).toHaveBeenCalled());
    await waitFor(() =>
      expect(modifierOrganisationAdmin).toHaveBeenCalledWith('org-1', { statut: 'suspendue' })
    );
  });

  it('ne suspend rien si la confirmation est refusée', async () => {
    SwalCustom.confirm.mockResolvedValue(false);
    render(<PlateformeOrganisations />);

    await screen.findByText('Sen BTP');
    fireEvent.click(bouton(ACTIVE, /Suspendre/i));

    await waitFor(() => expect(SwalCustom.confirm).toHaveBeenCalled());
    expect(modifierOrganisationAdmin).not.toHaveBeenCalled();
  });

  it('réactive SANS confirmation — le geste ne retire rien', async () => {
    modifierOrganisationAdmin.mockResolvedValue({});
    render(<PlateformeOrganisations />);

    await screen.findByText('Delta Construction');
    fireEvent.click(bouton(SUSPENDUE, /Réactiver/i));

    await waitFor(() =>
      expect(modifierOrganisationAdmin).toHaveBeenCalledWith('org-2', { statut: 'active' })
    );
    expect(SwalCustom.confirm).not.toHaveBeenCalled();
  });

  it('reste utilisable quand le catalogue des formules ne répond pas', async () => {
    // Le menu déroulant des formules est secondaire : son échec ne doit pas
    // empêcher de consulter les organisations.
    listerPlansAbonnement.mockRejectedValue(new Error('timeout'));

    render(<PlateformeOrganisations />);

    expect(await screen.findByText('Sen BTP')).toBeTruthy();
    // Le code stocké prend le relais du nom commercial introuvable.
    expect(ligneDe(ACTIVE).textContent).toContain('pro');
  });

  it('distingue un accès refusé d’une liste vide', async () => {
    const err = new Error('interdit');
    err.response = { status: 403, data: { message: 'Réservé au super-admin.' } };
    listerOrganisations.mockRejectedValue(err);

    render(<PlateformeOrganisations />);

    expect(await screen.findByText(/Accès refusé/)).toBeTruthy();
  });
});
