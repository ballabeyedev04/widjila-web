import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import Abonnement from './Abonnement.jsx';
import {
  getPlans, getStatus, getDroits, getHistorique, creerPaymentIntent,
} from '../../service/subscription/subscriptionService.js';
import { ROLE_TITULAIRE } from '../../utils/constants.js';

/**
 * L'écran d'abonnement — là où arrive le bouton « Choisir cette formule » du
 * mobile.
 *
 * ## Ce qui se passait
 *
 * Le navigateur du téléphone s'ouvrait sans session. L'écran demandait
 * `/abonnement/status` quand même : 401, puis refresh sans cookie (400,
 * « refreshToken manquant »), puis renvoi vers `/login`. Et même connecté,
 * la grille plantait au rendu (`Users` non importé), et le formulaire de
 * carte aussi (`Loader2`, `AlertCircle`, `CreditCard`).
 *
 * ## Ce que ces tests verrouillent
 *
 *  - rien qui exige une session ne part tant qu'elle n'est pas établie ;
 *  - la formule choisie sur le mobile ouvre DIRECTEMENT son paiement, si et
 *    seulement si ce compte peut la payer ;
 *  - on ne propose jamais de repayer la formule en cours.
 */

const { etat, swal } = vi.hoisted(() => ({
  etat: { user: null, pretAuthentification: true, transfertEchoue: false },
  swal: { success: vi.fn(), info: vi.fn(), error: vi.fn(), confirm: vi.fn() },
}));

vi.mock('../../context/useUser.js', () => ({ useUser: () => etat }));
vi.mock('../../utils/swal.config.js', () => ({ default: swal }));
vi.mock('../../service/subscription/subscriptionService.js', () => ({
  getPlans: vi.fn(),
  getStatus: vi.fn(),
  getDroits: vi.fn(),
  getHistorique: vi.fn(),
  creerPaymentIntent: vi.fn(),
}));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => Promise.resolve({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));

const ESSENTIEL = {
  id: '11111111-1111-1111-1111-111111111111', code: 'essentiel', nom: 'Essentiel',
  prix: 49, devise: 'EUR', periode: 'mois', surDevis: false,
  limiteUtilisateurs: 2, limiteChantiers: null, fonctionnalites: ['reserves'],
};
const PRO = {
  id: '22222222-2222-2222-2222-222222222222', code: 'pro', nom: 'Pro',
  prix: 89, devise: 'EUR', periode: 'mois', surDevis: false,
  limiteUtilisateurs: 5, limiteChantiers: null, fonctionnalites: ['reserves', 'rapports'],
};
const ENTREPRISE = {
  id: '33333333-3333-3333-3333-333333333333', code: 'entreprise', nom: 'Entreprise',
  prix: null, devise: 'EUR', periode: 'mois', surDevis: true,
  limiteUtilisateurs: null, limiteChantiers: null, fonctionnalites: ['api'],
};

const TITULAIRE = { id: 'u1', role: ROLE_TITULAIRE, prenom: 'Balla', nom: 'Beye' };
const EN_ESSAI = { isSubscribed: false, trialEnded: false, joursRestantsTrial: 1 };

/** Page de connexion factice : montre l'adresse de retour reçue. */
function SondeConnexion() {
  const { state } = useLocation();
  return <p>retour={state?.retour}</p>;
}

const afficher = (adresse = '/abonnement') => render(
  <MemoryRouter initialEntries={[adresse]}>
    <Routes>
      <Route path="/abonnement" element={<Abonnement />} />
      <Route path="/login" element={<SondeConnexion />} />
    </Routes>
  </MemoryRouter>,
);

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(etat, { user: null, pretAuthentification: true, transfertEchoue: false });
  getPlans.mockResolvedValue({ plans: [ESSENTIEL, PRO, ENTREPRISE] });
  getStatus.mockResolvedValue(EN_ESSAI);
  getDroits.mockResolvedValue({ droits: null, usage: null });
  getHistorique.mockResolvedValue([]);
  creerPaymentIntent.mockResolvedValue({ clientSecret: 'pi_1_secret_2' });
});

describe('sans session', () => {
  it('visiteur : AUCUN appel qui exige une session — donc aucune cascade 401', async () => {
    afficher();

    await screen.findByRole('heading', { name: 'Pro' });
    expect(getStatus).not.toHaveBeenCalled();
    expect(getDroits).not.toHaveBeenCalled();
    expect(creerPaymentIntent).not.toHaveBeenCalled();
  });

  it('session pas encore tranchée : rien ne part, et rien n’est cliquable', async () => {
    // Le transfert du mobile ou la reconnexion silencieuse sont peut-être en vol.
    etat.pretAuthentification = false;

    afficher('/abonnement?plan=pro');

    await screen.findByRole('heading', { name: 'Pro' });
    expect(getStatus).not.toHaveBeenCalled();
    screen.getAllByRole('button', { name: 'Choisir ce plan' })
      .forEach((bouton) => expect(bouton.disabled).toBe(true));
  });

  it('choisir sans session mène à la connexion, avec retour sur la formule', async () => {
    afficher();

    const [premier] = await screen.findAllByRole('button', { name: 'Se connecter pour choisir' });
    fireEvent.click(premier);

    expect(await screen.findByText('retour=/abonnement?plan=essentiel')).toBeTruthy();
  });

  it('lien du mobile expiré : on l’explique, au lieu d’un « non connecté » muet', async () => {
    etat.transfertEchoue = true;

    afficher();

    expect(await screen.findByText(/a expiré ou a déjà servi/)).toBeTruthy();
  });
});

describe('arrivée depuis le mobile avec ?plan=', () => {
  it('le titulaire arrive DIRECTEMENT sur le paiement de la formule choisie', async () => {
    etat.user = TITULAIRE;

    afficher('/abonnement?plan=pro');

    await waitFor(() => expect(creerPaymentIntent).toHaveBeenCalledWith(PRO.id));
    expect(creerPaymentIntent).toHaveBeenCalledTimes(1);
    // Le récapitulatif annonce le montant dans la devise de la formule.
    expect(await screen.findByText(/^89\s€ \/ mois$/)).toBeTruthy();
    // Et qui paie : la session peut venir du téléphone.
    expect(screen.getByText('Connecté en tant que Balla Beye')).toBeTruthy();
  });

  it('un rôle hors facturation : pas de paiement ouvert, et le bouton dit pourquoi', async () => {
    etat.user = { id: 'u2', role: 'ConducteurTravaux', prenom: 'Awa', nom: 'Sow' };

    afficher('/abonnement?plan=pro');

    const boutons = await screen.findAllByRole('button', { name: "Réservé au responsable de l'abonnement" });
    expect(boutons).toHaveLength(2);
    boutons.forEach((bouton) => expect(bouton.disabled).toBe(true));
    expect(creerPaymentIntent).not.toHaveBeenCalled();
  });

  it('la formule DÉJÀ payée n’est jamais repayée par ce raccourci', async () => {
    etat.user = TITULAIRE;
    getStatus.mockResolvedValue({ isSubscribed: true, planCode: 'essentiel', planActuel: 'Essentiel' });

    afficher('/abonnement?plan=essentiel');

    await screen.findByRole('button', { name: 'Plan actuel' });
    // Laisse aux effets le temps de trancher.
    await new Promise((r) => setTimeout(r, 30));
    expect(creerPaymentIntent).not.toHaveBeenCalled();
  });
});

describe('abonnement en cours', () => {
  it('seule la formule en cours est neutralisée : changer de formule reste possible', async () => {
    etat.user = TITULAIRE;
    getStatus.mockResolvedValue({ isSubscribed: true, planCode: 'essentiel', planActuel: 'Essentiel' });

    afficher();

    const actuel = await screen.findByRole('button', { name: 'Plan actuel' });
    expect(actuel.disabled).toBe(true);

    const choisir = screen.getByRole('button', { name: 'Choisir ce plan' });
    expect(choisir.disabled).toBe(false);
    fireEvent.click(choisir);
    await waitFor(() => expect(creerPaymentIntent).toHaveBeenCalledWith(PRO.id));
  });
});
