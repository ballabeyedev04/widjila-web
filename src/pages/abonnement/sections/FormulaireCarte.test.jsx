import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../../i18n/index.js';
import PaymentForm from './FormulaireCarte.jsx';

/**
 * Le formulaire de carte — le SEUL bloc qui touche Stripe.
 *
 * Il utilisait `Loader2`, `AlertCircle` et `CreditCard` sans les importer :
 * il levait une ReferenceError dès son premier rendu (l'indicateur
 * « Préparation… » s'affiche pendant la création de l'intention de paiement).
 * L'écran de paiement ne s'affichait donc JAMAIS. Ces tests le montent dans
 * chacun de ses états.
 */

const { stripe } = vi.hoisted(() => ({ stripe: { confirmCardPayment: vi.fn() } }));

vi.mock('@stripe/react-stripe-js', () => ({
  CardElement: () => <div data-testid="carte" />,
  useStripe: () => stripe,
  useElements: () => ({ getElement: () => ({}) }),
}));

const PRO = { id: 'p2', code: 'pro', nom: 'Pro', prix: 89, devise: 'EUR', periode: 'mois' };

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

beforeEach(() => vi.clearAllMocks());

const bouton = () => screen.getByRole('button');

describe('états du bouton', () => {
  it('pendant la préparation : « Préparation… », sans planter', () => {
    render(<PaymentForm plan={PRO} clientSecret={null} loading onSuccess={vi.fn()} />);

    expect(screen.getByText('Préparation…')).toBeTruthy();
    expect(bouton().disabled).toBe(true);
  });

  it('sans intention de paiement, rien à confirmer : bouton inactif', () => {
    render(<PaymentForm plan={PRO} clientSecret={null} loading={false} onSuccess={vi.fn()} />);

    expect(bouton().disabled).toBe(true);
  });

  it('prêt : annonce le montant, la devise et la période de LA formule', () => {
    render(<PaymentForm plan={PRO} clientSecret="pi_1_secret_2" loading={false} onSuccess={vi.fn()} />);

    expect(bouton().disabled).toBe(false);
    expect(bouton().textContent).toMatch(/Confirmer le paiement de 89\s€ \/ mois/);
  });

  it('une formule annuelle en francs CFA n’est pas annoncée « €/mois »', () => {
    const annuelle = { ...PRO, prix: 490000, devise: 'XOF', periode: 'an' };

    render(<PaymentForm plan={annuelle} clientSecret="pi_1_secret_2" loading={false} onSuccess={vi.fn()} />);

    expect(bouton().textContent).toMatch(/F\s?CFA/);
    expect(bouton().textContent).toMatch(/\/ an/);
    expect(bouton().textContent).not.toMatch(/€/);
  });
});

describe('verdict de Stripe', () => {
  const soumettre = async () => {
    fireEvent.click(bouton());
    await waitFor(() => expect(stripe.confirmCardPayment).toHaveBeenCalled());
  };

  it.each(['succeeded', 'processing'])('« %s » : le parent est prévenu', async (statut) => {
    stripe.confirmCardPayment.mockResolvedValue({ paymentIntent: { status: statut } });
    const onSuccess = vi.fn();
    render(<PaymentForm plan={PRO} clientSecret="pi_1_secret_2" loading={false} onSuccess={onSuccess} />);

    await soumettre();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(statut));
    expect(stripe.confirmCardPayment).toHaveBeenCalledWith('pi_1_secret_2', { payment_method: { card: {} } });
  });

  it('carte refusée : le message s’affiche SOUS le champ, sans planter', async () => {
    stripe.confirmCardPayment.mockResolvedValue({ paymentIntent: { status: 'requires_payment_method' } });
    const onSuccess = vi.fn();
    render(<PaymentForm plan={PRO} clientSecret="pi_1_secret_2" loading={false} onSuccess={onSuccess} />);

    await soumettre();

    expect(await screen.findByText(/Paiement refusé/)).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('erreur Stripe (3-D Secure, fonds…) : son message est relayé tel quel', async () => {
    stripe.confirmCardPayment.mockResolvedValue({ error: { message: 'Votre carte a été refusée.' } });
    render(<PaymentForm plan={PRO} clientSecret="pi_1_secret_2" loading={false} onSuccess={vi.fn()} />);

    await soumettre();

    expect(await screen.findByText(/Votre carte a été refusée\./)).toBeTruthy();
  });
});
