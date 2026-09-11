import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import i18n from '../../../i18n/index.js';

import AbonnementTab from './OngletAbonnement.jsx';
import { versDetailsOnglet } from './detailsAbonnement.js';

/**
 * L'onglet « Abonnement » de la page Organisation, nourri avec la réponse
 * RÉELLE du serveur.
 *
 * Il lisait `isSubscribed` et `allPlans`, que `GET /abonnement/plan-details`
 * ne renvoie plus (il sert `{ droits, usage, souscription, plans }`). Résultat
 * en production : aucune formule lue, puis une ReferenceError dans la branche
 * « aucun plan » (`EmptyState` non importé) — l'onglet plantait à chaque
 * ouverture. Ces tests partent donc du format du serveur, pas de celui que
 * l'onglet espérait.
 */

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));

/** Réponse de `subscription.service.js#getPlanDetails`, telle quelle. */
const REPONSE_SERVEUR = {
  droits: {
    actif: true, source: 'abonnement', planCode: 'essentiel', planNom: 'Essentiel',
    essaiEnCours: false, dateFin: '2026-10-11T00:00:00.000Z',
  },
  usage: { utilisateurs: { courant: 1, limite: 2 }, chantiers: { courant: 1, limite: null } },
  souscription: { planCode: 'essentiel', statut: 'active' },
  plans: [
    {
      id: '11111111-1111-1111-1111-111111111111', code: 'essentiel', nom: 'Essentiel',
      prix: 49, devise: 'EUR', periode: 'mois', surDevis: false,
      limiteUtilisateurs: 2, limiteChantiers: null, fonctionnalites: ['reserves', 'mobile'],
    },
    {
      id: '22222222-2222-2222-2222-222222222222', code: 'pro', nom: 'Pro',
      prix: 89, devise: 'EUR', periode: 'mois', surDevis: false,
      limiteUtilisateurs: 5, limiteChantiers: null, fonctionnalites: ['reserves', 'rapports'],
    },
    {
      id: '33333333-3333-3333-3333-333333333333', code: 'entreprise', nom: 'Entreprise',
      prix: null, devise: 'EUR', periode: 'mois', surDevis: true,
      limiteUtilisateurs: null, limiteChantiers: null, fonctionnalites: ['api'],
    },
  ],
};

const afficher = (props = {}) => render(
  <AbonnementTab
    planDetails={versDetailsOnglet(REPONSE_SERVEUR)}
    planLoading={false}
    selectedPlan={null}
    clientSecret={null}
    paymentLoading={false}
    paymentError={null}
    stripePromise={null}
    onSelectPlan={vi.fn()}
    onCancelSelection={vi.fn()}
    onCancelSubscription={vi.fn()}
    onPaymentSuccess={vi.fn()}
    {...props}
  />,
);

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

describe('lecture de la réponse du serveur', () => {
  it('affiche les formules du catalogue — et ne plante plus', () => {
    afficher();

    expect(screen.getByRole('heading', { name: 'Essentiel' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeTruthy();
  });

  it('annonce le prix dans la devise de la formule, avec sa période', () => {
    afficher();

    expect(screen.getByText(/^89\s€$/)).toBeTruthy();
    expect(screen.getAllByText('/ mois').length).toBeGreaterThan(0);
  });

  it('reconnaît la formule en cours par son code, et ne la propose pas', () => {
    afficher();

    const actuel = screen.getByRole('button', { name: 'Plan actuel' });
    expect(actuel.disabled).toBe(true);
    // Les autres restent souscriptibles : changer de formule reste possible.
    expect(screen.getByRole('button', { name: 'Passer à ce plan' }).disabled).toBe(false);
  });

  it('une formule sur devis se contacte, elle ne se paie pas', () => {
    const onSelectPlan = vi.fn();
    afficher({ onSelectPlan });

    const contact = screen.getByRole('link', { name: 'Nous contacter' });
    expect(contact.getAttribute('href')).toBe('mailto:contact@widjila.com');
  });

  it('« null » veut dire illimité, jamais « null chantiers max »', () => {
    afficher();

    expect(screen.getAllByText(/Chantiers illimités/).length).toBe(3);
    expect(screen.queryByText(/null/)).toBeNull();
  });

  it('choisir une formule remonte la formule entière, identifiant compris', () => {
    const onSelectPlan = vi.fn();
    afficher({ onSelectPlan });

    fireEvent.click(screen.getByRole('button', { name: 'Passer à ce plan' }));

    expect(onSelectPlan).toHaveBeenCalledWith(expect.objectContaining({ code: 'pro' }));
  });
});

describe('cas limites qui plantaient', () => {
  it('catalogue vide : un état vide, pas une ReferenceError', () => {
    afficher({ planDetails: versDetailsOnglet({ ...REPONSE_SERVEUR, plans: [] }) });

    expect(screen.getByText('Aucun plan disponible')).toBeTruthy();
  });

  it('clé Stripe absente : l’explication s’affiche, pas une ReferenceError', () => {
    afficher({ selectedPlan: REPONSE_SERVEUR.plans[1] });

    expect(screen.getByText('Paiement par carte non disponible')).toBeTruthy();
  });
});

describe('versDetailsOnglet', () => {
  it('pendant l’essai : non abonné, jours restants du serveur', () => {
    const details = versDetailsOnglet({
      droits: { source: 'essai', essaiEnCours: true, joursRestants: 2, dateFin: '2026-09-13' },
      plans: REPONSE_SERVEUR.plans,
    });

    expect(details.isSubscribed).toBe(false);
    expect(details.trialEnded).toBe(false);
    expect(details.joursRestantsTrial).toBe(2);
    expect(details.planActuelDetails).toBeNull();
  });

  it('l’ancien format, s’il revient, prime', () => {
    const details = versDetailsOnglet({ isSubscribed: false, allPlans: [] });

    expect(details.isSubscribed).toBe(false);
    expect(details.allPlans).toEqual([]);
  });
});
