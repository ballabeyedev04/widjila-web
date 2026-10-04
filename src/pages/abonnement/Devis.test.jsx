import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import Abonnement from './Abonnement.jsx';
import {
  getPlans, getStatus, getDroits, getHistorique, getEtatPaiement,
  demanderDevis, listerDevis, accepterDevis, refuserDevis, payerDevis,
} from '../../service/subscription/subscriptionService.js';
import { ROLE_TITULAIRE } from '../../utils/constants.js';

/**
 * Le parcours « Premium sur devis » (cahier des charges du 04/10/2026).
 *
 * Ce que ces tests verrouillent, côté écran :
 *
 *  1. le client DEMANDE — le formulaire ne comporte aucun champ de montant ;
 *  2. un devis non chiffré s'annonce « en préparation », sans bouton ;
 *  3. un devis chiffré montre HT, TVA, TTC, durée et limites, avec
 *     « Accepter » et « Refuser » ;
 *  4. « Procéder au paiement » n'apparaît qu'une fois ACCEPTÉ, et part vers
 *     l'adresse que le SERVEUR a rendue — jamais vers un montant calculé ici ;
 *  5. un devis périmé ou déjà réglé n'offre aucun bouton ;
 *  6. un rôle hors facturation ne voit pas la section.
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
  demanderDevis: vi.fn(),
  listerDevis: vi.fn(),
  accepterDevis: vi.fn(),
  refuserDevis: vi.fn(),
  payerDevis: vi.fn(),
}));

const PREMIUM = {
  id: '33333333-3333-3333-3333-333333333333', code: 'entreprise', nom: 'Entreprise',
  prix: null, devise: 'EUR', periode: 'mois', surDevis: true,
  limiteUtilisateurs: null, limiteChantiers: null, fonctionnalites: ['api'],
};

const TITULAIRE = { id: 'u1', role: ROLE_TITULAIRE, prenom: 'Balla', nom: 'Beye' };

/** Devis tel que le serveur le renvoie — ce sont SES drapeaux qui décident. */
const devis = (extra = {}) => ({
  id: 'dev-1', numero: 'WDJ-2026-0001', statut: 'envoye',
  montantHt: 6500, tauxTva: 20, montantTva: 1300, montantTtc: 7800, devise: 'EUR',
  dureeMois: 12, limiteUtilisateurs: 25, limiteChantiers: null,
  conditions: null, motifRefus: null, payeLe: null,
  creeLe: '2026-10-01T10:00:00.000Z', expireLe: '2026-11-01T10:00:00.000Z',
  chiffre: true, peutEtreAccepte: true, peutEtrePaye: false,
  ...extra,
});

const afficher = () => render(
  <MemoryRouter initialEntries={['/abonnement']}><Abonnement /></MemoryRouter>,
);

beforeAll(async () => { await i18n.changeLanguage('fr'); });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(etat, { user: TITULAIRE, pretAuthentification: true, transfertEchoue: false });
  getPlans.mockResolvedValue({ plans: [PREMIUM] });
  getStatus.mockResolvedValue({ isSubscribed: false, trialEnded: false, joursRestantsTrial: 1 });
  getDroits.mockResolvedValue({ droits: null, usage: null });
  getHistorique.mockResolvedValue([]);
  getEtatPaiement.mockResolvedValue({ paiement: null, droits: null });
  listerDevis.mockResolvedValue([]);
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign: vi.fn() },
  });
});

describe('la demande de devis', () => {
  it('« Demander un devis » ouvre un formulaire SANS aucun champ de montant', async () => {
    afficher();

    const boutons = await screen.findAllByRole('button', { name: 'Demander un devis' });
    fireEvent.click(boutons[0]);

    expect(await screen.findByText('Votre demande de devis')).toBeTruthy();
    expect(screen.getByLabelText(/Nombre d'utilisateurs/)).toBeTruthy();
    expect(screen.getByLabelText(/Durée souhaitée/)).toBeTruthy();
    // Le client décrit un besoin, il ne pose aucun prix.
    expect(screen.queryByLabelText(/montant/i)).toBeNull();
    expect(screen.queryByLabelText(/prix/i)).toBeNull();
  });

  it('envoie la demande au serveur et annonce le succès', async () => {
    demanderDevis.mockResolvedValue(devis({ statut: 'brouillon', chiffre: false, peutEtreAccepte: false }));
    afficher();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Demander un devis' }))[0]);
    fireEvent.change(await screen.findByLabelText(/Nombre d'utilisateurs/), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(/Vos besoins particuliers/), { target: { value: 'Multi-agences' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer ma demande/ }));

    await waitFor(() => expect(demanderDevis).toHaveBeenCalledWith(expect.objectContaining({
      nbUtilisateurs: 25, besoins: 'Multi-agences',
    })));
    // Les nombres partent en nombres : une chaîne vide serait refusée.
    expect(demanderDevis.mock.calls[0][0].nbChantiers).toBeNull();
    await waitFor(() => expect(swal.success).toHaveBeenCalled());
  });

  it('un devis non chiffré s’annonce « en préparation », sans bouton', async () => {
    listerDevis.mockResolvedValue([devis({ statut: 'brouillon', chiffre: false, peutEtreAccepte: false })]);
    afficher();

    expect(await screen.findByText(/en cours de préparation/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accepter le devis' })).toBeNull();
    // Et on ne propose pas d'en demander un second.
    expect(screen.queryByRole('button', { name: 'Demander un devis' })?.closest('.devis-section')).toBeFalsy();
  });
});

describe('le devis reçu', () => {
  it('affiche HT, TVA, TTC, durée et limites', async () => {
    listerDevis.mockResolvedValue([devis()]);
    afficher();

    expect(await screen.findByText('WDJ-2026-0001')).toBeTruthy();
    expect(screen.getByText('6 500 €')).toBeTruthy();
    expect(screen.getByText('1 300 €')).toBeTruthy();
    expect(screen.getByText('7 800 €')).toBeTruthy();
    expect(screen.getByText('12 mois')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
  });

  it('« Accepter » met à jour le devis avec ce que rend le serveur', async () => {
    listerDevis.mockResolvedValue([devis()]);
    accepterDevis.mockResolvedValue(devis({ statut: 'accepte', peutEtreAccepte: false, peutEtrePaye: true }));
    afficher();

    fireEvent.click(await screen.findByRole('button', { name: /Accepter le devis/ }));

    await waitFor(() => expect(accepterDevis).toHaveBeenCalledWith('dev-1'));
    // Le serveur dit « payable » : le bouton de paiement apparaît.
    expect(await screen.findByRole('button', { name: /Procéder au paiement/ })).toBeTruthy();
  });

  it('« Refuser » demande un motif avant de confirmer', async () => {
    listerDevis.mockResolvedValue([devis()]);
    refuserDevis.mockResolvedValue(devis({ statut: 'refuse', peutEtreAccepte: false, motifRefus: 'Budget 2027' }));
    afficher();

    fireEvent.click(await screen.findByRole('button', { name: /Refuser/ }));
    fireEvent.change(screen.getByLabelText(/Motif/), { target: { value: 'Budget 2027' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le refus/ }));

    await waitFor(() => expect(refuserDevis).toHaveBeenCalledWith('dev-1', 'Budget 2027'));
  });
});

describe('le paiement du devis', () => {
  it('part vers l’adresse rendue par le SERVEUR', async () => {
    listerDevis.mockResolvedValue([devis({ statut: 'accepte', peutEtreAccepte: false, peutEtrePaye: true })]);
    payerDevis.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_devis', sessionId: 'cs_devis' });
    afficher();

    fireEvent.click(await screen.findByRole('button', { name: /Procéder au paiement/ }));

    await waitFor(() => expect(payerDevis).toHaveBeenCalledWith('dev-1'));
    await waitFor(() => expect(window.location.assign)
      .toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_devis'));
  });

  it('serveur indisponible : un message, aucun départ', async () => {
    listerDevis.mockResolvedValue([devis({ statut: 'accepte', peutEtreAccepte: false, peutEtrePaye: true })]);
    payerDevis.mockRejectedValue({ response: { data: { message: 'Ce devis a expiré.' } } });
    afficher();

    fireEvent.click(await screen.findByRole('button', { name: /Procéder au paiement/ }));

    expect(await screen.findByText('Ce devis a expiré.')).toBeTruthy();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('un devis PÉRIMÉ n’offre ni acceptation ni paiement', async () => {
    // Les drapeaux viennent du serveur : l'écran ne recalcule pas la règle.
    listerDevis.mockResolvedValue([devis({ statut: 'expire', peutEtreAccepte: false, peutEtrePaye: false })]);
    afficher();

    await screen.findByText('WDJ-2026-0001');
    expect(screen.queryByRole('button', { name: /Accepter le devis/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Procéder au paiement/ })).toBeNull();
  });

  it('un devis déjà réglé affiche sa date et plus aucun bouton', async () => {
    listerDevis.mockResolvedValue([devis({
      statut: 'accepte', peutEtreAccepte: false, peutEtrePaye: false,
      payeLe: '2026-10-05T09:00:00.000Z',
    })]);
    afficher();

    expect(await screen.findByText(/Réglé le/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Procéder au paiement/ })).toBeNull();
  });
});

describe('cloisonnement', () => {
  it('un rôle hors facturation ne voit NI la section NI la requête partir', async () => {
    etat.user = { id: 'u2', role: 'ConducteurTravaux', prenom: 'Awa', nom: 'Sow' };
    afficher();

    await screen.findByRole('heading', { name: 'Entreprise' });
    expect(listerDevis).not.toHaveBeenCalled();
    expect(screen.queryByText('Premium — sur devis')).toBeNull();
  });
});
