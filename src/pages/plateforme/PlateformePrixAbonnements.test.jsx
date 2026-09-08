import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../i18n/index.js';

import PlateformePrixAbonnements from './PlateformePrixAbonnements.jsx';
import {
  listerPlansAbonnement, basculerActifPlanAbonnement, supprimerPlanAbonnement,
} from '../../service/abonnement/planAbonnementService.js';
import SwalCustom from '../../utils/swal.config.js';

/**
 * Catalogue des formules d'abonnement — le seul écran du portail qui touche à
 * l'argent.
 *
 * Deux règles y sont portées par le serveur, et l'écran doit les servir sans
 * les contredire :
 *
 *   - une formule DÉJÀ SOUSCRITE ne se supprime pas ; on la désactive, elle
 *     quitte l'offre et les abonnés la gardent. La confirmation l'annonce
 *     AVANT le clic, pour que la désactivation apparaisse comme la voie
 *     normale ;
 *   - un échec de chargement n'est pas un catalogue vide : sans distinction,
 *     une panne réseau inviterait à recréer des formules qui existent.
 */

vi.mock('../../service/abonnement/planAbonnementService.js', () => ({
  listerPlansAbonnement: vi.fn(),
  creerPlanAbonnement: vi.fn(),
  modifierPlanAbonnement: vi.fn(),
  basculerActifPlanAbonnement: vi.fn(),
  supprimerPlanAbonnement: vi.fn(),
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: {
    error: vi.fn(), success: vi.fn(), toast: vi.fn(),
    confirm: vi.fn(() => Promise.resolve(true)),
  },
}));

const PRO = {
  id: 'f1',
  code: 'pro',
  nom: 'Pro',
  prix: 79,
  devise: 'EUR',
  periode: 'mois',
  ordre: 2,
  actif: true,
  limiteUtilisateurs: 25,
  limiteChantiers: null,
  fonctionnalites: ['plans'],
};

const catalogue = (plans = [PRO]) => ({ plans, fonctionnalites: { plans: 'Plans' } });

describe('PlateformePrixAbonnements', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    SwalCustom.confirm.mockResolvedValue(true);
    listerPlansAbonnement.mockResolvedValue(catalogue());
  });

  it('affiche le prix et les limites de chaque formule', async () => {
    render(<PlateformePrixAbonnements />);

    expect(await screen.findByText('Pro')).toBeTruthy();
    expect(screen.getByText(/79 EUR/)).toBeTruthy();
    // Une limite absente est ILLIMITÉE, pas « 0 » ni un tiret.
    expect(screen.getByText(/Illimité/i)).toBeTruthy();
  });

  it('désactive une formule sans la supprimer', async () => {
    basculerActifPlanAbonnement.mockResolvedValue({});
    render(<PlateformePrixAbonnements />);

    fireEvent.click(await screen.findByRole('button', { name: /Désactiver/ }));

    await waitFor(() => expect(basculerActifPlanAbonnement).toHaveBeenCalledWith('f1', false));
    expect(supprimerPlanAbonnement).not.toHaveBeenCalled();
  });

  it('prévient AVANT de supprimer, et n’agit qu’à la confirmation', async () => {
    SwalCustom.confirm.mockResolvedValue(false);
    render(<PlateformePrixAbonnements />);

    await screen.findByText('Pro');
    const boutons = screen.getAllByRole('button');
    fireEvent.click(boutons[boutons.length - 1]);

    await waitFor(() => expect(SwalCustom.confirm).toHaveBeenCalled());
    expect(supprimerPlanAbonnement).not.toHaveBeenCalled();
  });

  it('propose de réessayer plutôt qu’un catalogue vide sur panne', async () => {
    listerPlansAbonnement.mockRejectedValueOnce(new Error('serveur injoignable'));

    render(<PlateformePrixAbonnements />);

    fireEvent.click(await screen.findByRole('button', { name: /Réessayer/ }));

    await waitFor(() => expect(listerPlansAbonnement).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Pro')).toBeTruthy();
  });

  it('distingue un catalogue réellement vide', async () => {
    listerPlansAbonnement.mockResolvedValue(catalogue([]));

    render(<PlateformePrixAbonnements />);

    expect(await screen.findByRole('button', { name: /Nouvelle formule/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Réessayer/ })).toBeNull();
  });
});
