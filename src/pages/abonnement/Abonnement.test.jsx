import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import Abonnement from './Abonnement.jsx';
import {
  getPlans, getStatus, getDroits, getHistorique, creerCheckoutSession, getEtatPaiement,
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
vi.mock('../../context/SubscriptionContext.jsx', () => ({ useSubscription: () => ({ refreshStatus: vi.fn() }) }));
vi.mock('../../utils/swal.config.js', () => ({ default: swal }));
vi.mock('../../service/subscription/subscriptionService.js', () => ({
  getPlans: vi.fn(),
  getStatus: vi.fn(),
  getDroits: vi.fn(),
  getHistorique: vi.fn(),
  creerCheckoutSession: vi.fn(),
  getEtatPaiement: vi.fn(),
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
  creerCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_1', sessionId: 'cs_test_1' });
  getEtatPaiement.mockResolvedValue({ paiement: { statut: 'en_attente' }, droits: null });
  // `window.location.assign` : la page part vers Stripe — on observe sans partir.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign: vi.fn() },
  });
});

describe('sans session', () => {
  it('visiteur : AUCUN appel qui exige une session — donc aucune cascade 401', async () => {
    afficher();

    await screen.findByRole('heading', { name: 'Pro' });
    expect(getStatus).not.toHaveBeenCalled();
    expect(getDroits).not.toHaveBeenCalled();
    expect(creerCheckoutSession).not.toHaveBeenCalled();
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
  it('le titulaire arrive DIRECTEMENT sur le récapitulatif de la formule choisie', async () => {
    etat.user = TITULAIRE;

    afficher('/abonnement?plan=pro');

    // Le récapitulatif annonce la formule et le montant dans sa devise.
    expect(await screen.findByRole('heading', { name: 'Récapitulatif' })).toBeTruthy();
    expect(screen.getByText('Pro')).toBeTruthy();
    expect(screen.getByText('89 €')).toBeTruthy();
    // Et qui paie : la session peut venir du téléphone.
    expect(screen.getByText('Connecté en tant que Balla Beye')).toBeTruthy();
    // RIEN ne part vers le serveur tant que l'utilisateur n'a pas cliqué « Payer ».
    expect(creerCheckoutSession).not.toHaveBeenCalled();
  });

  it('« Payer » demande la session au serveur, puis part vers Stripe — une seule fois', async () => {
    etat.user = TITULAIRE;

    afficher('/abonnement?plan=pro');

    const payer = await screen.findByRole('button', { name: /^Payer/ });
    fireEvent.click(payer);
    fireEvent.click(payer); // double clic

    await waitFor(() => expect(creerCheckoutSession).toHaveBeenCalledWith(PRO.id));
    expect(creerCheckoutSession).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1'));
    // Aucun secret, aucune clé Stripe dans la page : seule l'adresse compte.
    expect(payer.disabled).toBe(true);
  });

  it('serveur indisponible au clic « Payer » : un message, pas de départ', async () => {
    etat.user = TITULAIRE;
    creerCheckoutSession.mockRejectedValue({ response: { data: { message: 'Formule inconnue' } } });

    afficher('/abonnement?plan=pro');

    fireEvent.click(await screen.findByRole('button', { name: /^Payer/ }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('un rôle hors facturation : pas de paiement ouvert, et le bouton dit pourquoi', async () => {
    etat.user = { id: 'u2', role: 'ConducteurTravaux', prenom: 'Awa', nom: 'Sow' };

    afficher('/abonnement?plan=pro');

    const boutons = await screen.findAllByRole('button', { name: "Réservé au responsable de l'abonnement" });
    expect(boutons).toHaveLength(2);
    boutons.forEach((bouton) => expect(bouton.disabled).toBe(true));
    expect(creerCheckoutSession).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Récapitulatif' })).toBeNull();
  });

  it('la formule DÉJÀ payée n’est jamais repayée par ce raccourci', async () => {
    etat.user = TITULAIRE;
    getStatus.mockResolvedValue({ isSubscribed: true, planCode: 'essentiel', planActuel: 'Essentiel' });

    afficher('/abonnement?plan=essentiel');

    await screen.findByRole('button', { name: 'Plan actuel' });
    // Laisse aux effets le temps de trancher.
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole('heading', { name: 'Récapitulatif' })).toBeNull();
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
    expect(await screen.findByRole('heading', { name: 'Récapitulatif' })).toBeTruthy();
  });
});

describe('retour de Stripe Checkout — le serveur seul fait foi', () => {
  beforeEach(() => { etat.user = TITULAIRE; });

  it('le serveur confirme (webhook passé) → « Paiement confirmé », état rechargé', async () => {
    getEtatPaiement
      .mockResolvedValueOnce({ paiement: { statut: 'en_attente' } })
      .mockResolvedValueOnce({ paiement: { statut: 'active', planCode: 'pro' } });
    getStatus
      .mockResolvedValueOnce(EN_ESSAI)
      .mockResolvedValue({ isSubscribed: true, planCode: 'pro', planActuel: 'Pro' });

    afficher('/abonnement?paiement=retour&session=cs_test_1');

    // Pendant l'attente : un bandeau de vérification, aucune annonce.
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(swal.success).not.toHaveBeenCalled();

    await waitFor(
      () => expect(swal.success).toHaveBeenCalledWith('Paiement confirmé. Votre abonnement est maintenant actif.'),
      { timeout: 5000 },
    );
    expect(getEtatPaiement).toHaveBeenCalledWith('cs_test_1');
    // Le badge d'en-tête reflète l'abonnement actif, sans rechargement manuel.
    expect(await screen.findByText(/Abonnement actif — Pro/)).toBeTruthy();
  });

  it("revenir sur l'adresse de succès SANS paiement n'annonce jamais un succès", async () => {
    // Le lien de retour peut être tapé, partagé, rejoué : seul l'état serveur compte.
    getEtatPaiement.mockResolvedValue({ paiement: { statut: 'en_attente' } });

    afficher('/abonnement?paiement=retour&session=cs_test_1');

    await waitFor(() => expect(getEtatPaiement).toHaveBeenCalled());
    // Les sept essais s'étalent sur ~27 s : on attend la fin des paliers.
    await screen.findByText(/en cours de vérification/, {}, { timeout: 40000 });
    expect(swal.success).not.toHaveBeenCalled();
    expect(getEtatPaiement).toHaveBeenCalledTimes(7);
  }, 45000);

  it('paiement refusé côté serveur → message d’échec, pas de succès', async () => {
    getEtatPaiement.mockResolvedValue({ paiement: { statut: 'echec' } });

    afficher('/abonnement?paiement=retour&session=cs_test_1');

    expect(await screen.findByText(/n'a pas pu être finalisé/, {}, { timeout: 5000 })).toBeTruthy();
    expect(swal.success).not.toHaveBeenCalled();
  });

  it('`?paiement=annule` → « annulé », aucun appel de vérification', async () => {
    afficher('/abonnement?paiement=annule');

    expect(await screen.findByText(/Le paiement a été annulé/)).toBeTruthy();
    expect(getEtatPaiement).not.toHaveBeenCalled();
    expect(swal.success).not.toHaveBeenCalled();
  });

});
