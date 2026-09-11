import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import Organisation from './Organisation.jsx';
import { getOrganisation } from '../../service/organisation/organisationService.js';

/**
 * Le faux « paiement réussi » déclenchable par un lien.
 *
 * L'écran annonçait « Paiement réussi ! Votre abonnement est actif » à
 * quiconque ouvrait `/organisation?payment=success`, sans rien vérifier. Un
 * attaquant pouvait envoyer ce lien à un gestionnaire : l'écran lui affirmait
 * un paiement qui n'avait jamais eu lieu — le point de départ classique d'une
 * fraude au support (« j'ai payé, votre écran le dit »).
 *
 * Le paiement se fait DANS la page (Stripe Elements) : ce retour par URL
 * n'existe même pas. Ce test garantit qu'aucun paramètre d'URL ne produit
 * jamais d'annonce de paiement.
 */

const { swal } = vi.hoisted(() => ({
  swal: { success: vi.fn(), info: vi.fn(), error: vi.fn(), confirm: vi.fn() },
}));

vi.mock('../../utils/swal.config.js', () => ({ default: swal }));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => null }));
vi.mock('../../context/useUser.js', () => ({
  useUser: () => ({ user: { id: 'u1', role: 'Entreprise' } }),
}));
vi.mock('../../service/organisation/organisationService.js', () => ({
  getOrganisation: vi.fn(),
  modifierOrganisation: vi.fn(),
  listerFiliales: vi.fn(),
  creerFiliale: vi.fn(),
  creerAgence: vi.fn(),
  getOrganigramme: vi.fn(),
}));
vi.mock('../../service/subscription/subscriptionService.js', () => ({
  getPlanDetails: vi.fn().mockResolvedValue({ isSubscribed: false, allPlans: [] }),
  getStatus: vi.fn().mockResolvedValue(null),
  creerPaymentIntent: vi.fn(),
  changerPlan: vi.fn(),
  annulerAbonnement: vi.fn(),
}));

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

beforeEach(async () => {
  vi.clearAllMocks();
  const { listerFiliales } = await import('../../service/organisation/organisationService.js');
  getOrganisation.mockResolvedValue({ id: 'o1', nom: 'Widjila BTP' });
  listerFiliales.mockResolvedValue({ items: [] });
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('paramètre ?payment= dans l’URL', () => {
  it.each(['success', 'cancel'])('`?payment=%s` ne produit AUCUNE annonce', async (valeur) => {
    window.history.replaceState({}, '', `/organisation?payment=${valeur}`);

    render(<MemoryRouter initialEntries={[`/organisation?payment=${valeur}`]}><Organisation /></MemoryRouter>);

    await waitFor(() => expect(getOrganisation).toHaveBeenCalled());
    // Laisse aux effets le temps de s'exécuter.
    await new Promise((r) => setTimeout(r, 30));

    expect(swal.success).not.toHaveBeenCalled();
    expect(swal.info).not.toHaveBeenCalled();
  });
});
