import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../../i18n/index.js';

import RapportsTab from './RapportsTab.jsx';
import {
  listerRapports, getRapport, genererRapport,
  preparerEnvoiRapport, envoyerRapportParMail,
} from '../../../service/rapport/rapportService.js';
import { listerPartenairesChantier } from '../../../service/organisation/organisationService.js';
import { fetchFichierBlob } from '../../../service/plan/planService.js';
import SwalCustom from '../../../utils/swal.config.js';

/**
 * L'onglet Rapports — génération, aperçu, téléchargement, envoi par e-mail.
 *
 * Ce que ces tests verrouillent, dans l'ordre de ce qui coûte le plus cher si
 * ça casse :
 *
 *   1. RIEN NE PART SANS VALIDATION. Ouvrir « Envoyer par e-mail » PRÉPARE le
 *      message et l'affiche ; seul le clic sur « Envoyer » l'expédie. C'est
 *      une exigence explicite du client, et la seule barrière entre un clic
 *      malheureux et un rapport diffusé à des tiers.
 *   2. L'écran MONTRE ce qui partira : entreprise en destinataire, clients en
 *      copie, objet, message, pièce jointe. Une modale qui n'afficherait
 *      qu'un « Confirmer ? » ne serait pas une validation.
 *   3. Décocher une adresse la RETIRE de l'envoi — et la liste envoyée au
 *      serveur ne contient que des retraits.
 *   4. Le PDF est récupéré AVEC le jeton d'authentification. Une `<iframe
 *      src="/uploads/…">` pointerait sur le domaine de l'admin, sans Bearer :
 *      l'aperçu afficherait une page d'erreur.
 */

vi.mock('../../../service/rapport/rapportService.js', () => ({
  listerRapports: vi.fn(),
  getRapport: vi.fn(),
  genererRapport: vi.fn(),
  supprimerRapport: vi.fn(),
  preparerEnvoiRapport: vi.fn(),
  envoyerRapportParMail: vi.fn(),
}));

vi.mock('../../../service/plan/planService.js', () => ({
  fetchFichierBlob: vi.fn(),
}));

vi.mock('../../../service/chantier/chantierService.js', () => ({
  listerLots: vi.fn(() => Promise.resolve({ items: [] })),
}));

vi.mock('../../../service/organisation/organisationService.js', () => ({
  listerPartenairesChantier: vi.fn(() => Promise.resolve({ items: [] })),
}));

vi.mock('../../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

// Rôle de pilotage : c'est lui qui peut générer et envoyer.
vi.mock('../../../context/useUser.js', () => ({
  useUser: () => ({ user: { id: 'u1', role: 'ChefProjet' } }),
}));

const RAPPORT = {
  id: 'rap-1',
  type: 'reserves',
  statut: 'genere',
  createdAt: '2026-09-09T08:00:00.000Z',
  fichier_url: '/uploads/rapports/rapport-reserves-RH.pdf',
};

/** Ce que le serveur renvoie quand on prépare l'envoi. */
const ENVOI = {
  rapportId: 'rap-1',
  chantierNom: 'Résidence Horizon',
  objet: 'Rapport de chantier – Résidence Horizon – 09/09/2026',
  message: 'Bonjour,\n\nVeuillez trouver en pièce jointe le rapport.',
  expediteur: 'Balla Beye',
  expediteurEmail: 'balla@widjila.com',
  nbReserves: 12,
  destinataires: [
    { id: 'p1', nom: 'SARL Toiture', email: 'toiture@ex.fr' },
    { id: 'p2', nom: 'Plomberie Diop', email: 'plomberie@ex.fr' },
  ],
  copies: [{ id: 'c1', nom: 'MOA Sénégal', email: 'moa@ex.fr' }],
  sansEmail: ['Électricité Fall'],
  pieceJointe: { nom: 'rapport-RH-2026.pdf', url: '/uploads/rapports/rapport-reserves-RH.pdf' },
};

beforeAll(async () => {
  await i18n.changeLanguage('fr');
  // jsdom n'implémente pas les URL d'objet : sans ce doublon, l'aperçu et le
  // téléchargement lèvent avant d'avoir rien vérifié.
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:faux';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:faux');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  listerRapports.mockResolvedValue({ items: [RAPPORT], total: 1 });
  getRapport.mockResolvedValue(RAPPORT);
  fetchFichierBlob.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
  preparerEnvoiRapport.mockResolvedValue(ENVOI);
  envoyerRapportParMail.mockResolvedValue({ message: 'Rapport envoyé à 2 entreprise(s).' });
  genererRapport.mockResolvedValue({ id: 'rap-2' });
  listerPartenairesChantier.mockResolvedValue({
    items: [{ id: 'p1', nom: 'SARL Toiture' }],
  });
});

const afficher = () => render(<RapportsTab chantierId="c1" />);

const bouton = (nom) => screen.getByRole('button', { name: nom });

// ── 1. Les trois actions demandées ──────────────────────────────────────────

describe('actions de la ligne', () => {
  it('propose prévisualiser, télécharger et envoyer par e-mail', async () => {
    afficher();
    await screen.findByRole('button', { name: 'Prévisualiser' });

    expect(bouton('Prévisualiser')).toBeTruthy();
    expect(bouton('Télécharger')).toBeTruthy();
    expect(bouton('Envoyer par e-mail')).toBeTruthy();
  });

  it('l’aperçu récupère le PDF via l’API authentifiée, pas par une URL nue', async () => {
    afficher();
    fireEvent.click(await screen.findByRole('button', { name: 'Prévisualiser' }));

    await waitFor(() => expect(fetchFichierBlob).toHaveBeenCalledWith(RAPPORT.fichier_url));
    const cadre = await screen.findByTitle(/Rapport/);
    expect(cadre.getAttribute('src')).toBe('blob:faux');
  });

  it('le téléchargement passe aussi par le blob authentifié', async () => {
    afficher();
    fireEvent.click(await screen.findByRole('button', { name: 'Télécharger' }));

    await waitFor(() => expect(fetchFichierBlob).toHaveBeenCalledWith(RAPPORT.fichier_url));
  });
});

// ── 2. Le ciblage d'une entreprise ──────────────────────────────────────────

describe('génération « par entreprise »', () => {
  it('vise le PARTENAIRE de l’annuaire, pas une organisation', async () => {
    afficher();
    fireEvent.click(await screen.findByRole('button', { name: /Générer un rapport/ }));

    // La liste doit venir du CHANTIER : l'envoi par e-mail cherche
    // l'entreprise visée dans ce chantier-là.
    await waitFor(() => expect(listerPartenairesChantier).toHaveBeenCalledWith('c1'));

    fireEvent.change(screen.getByLabelText(/Type de rapport/), { target: { value: 'entreprise' } });
    fireEvent.change(await screen.findByLabelText(/Entreprise/), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Générer' }));

    // `partenaireId` et non `entrepriseId` : ce dernier référence une
    // organisation cliente, jamais une fiche d'annuaire. Le filtre ne
    // correspondait à rien et le rapport sortait vide.
    await waitFor(() => expect(genererRapport).toHaveBeenCalledWith('c1', expect.objectContaining({
      type: 'entreprise',
      partenaireId: 'p1',
    })));
    expect(genererRapport.mock.calls[0][1].entrepriseId).toBeUndefined();
  });
});

// ── 3. L'envoi : préparer, montrer, puis seulement envoyer ──────────────────

describe('envoi par e-mail', () => {
  const ouvrirEnvoi = async () => {
    afficher();
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer par e-mail' }));
    await screen.findByText(ENVOI.objet);
  };

  it('OUVRIR la modale prépare le message mais N’ENVOIE RIEN', async () => {
    await ouvrirEnvoi();

    expect(preparerEnvoiRapport).toHaveBeenCalledWith('rap-1');
    expect(envoyerRapportParMail).not.toHaveBeenCalled();
  });

  it('montre l’entreprise, les clients en copie, l’objet et la pièce jointe', async () => {
    await ouvrirEnvoi();

    expect(screen.getByText('SARL Toiture')).toBeTruthy();
    expect(screen.getByText('toiture@ex.fr')).toBeTruthy();
    expect(screen.getByText('MOA Sénégal')).toBeTruthy();
    expect(screen.getByText('moa@ex.fr')).toBeTruthy();
    expect(screen.getByText(ENVOI.objet)).toBeTruthy();
    expect(screen.getByText('rapport-RH-2026.pdf')).toBeTruthy();
  });

  it('signale NOMMÉMENT les partenaires sans adresse e-mail', async () => {
    await ouvrirEnvoi();

    expect(screen.getByText(/Électricité Fall/)).toBeTruthy();
  });

  it('n’envoie qu’au clic sur « Envoyer »', async () => {
    await ouvrirEnvoi();
    fireEvent.click(bouton('Envoyer'));

    await waitFor(() => expect(envoyerRapportParMail).toHaveBeenCalledWith('rap-1', { exclure: [] }));
    await waitFor(() => expect(SwalCustom.success).toHaveBeenCalled());
  });

  it('décocher une adresse la transmet en RETRAIT, pas en ajout', async () => {
    await ouvrirEnvoi();

    const cases = screen.getAllByRole('checkbox');
    // Toutes cochées à l'ouverture : l'utilisateur retire, il n'ajoute pas.
    expect(cases.every((c) => c.checked)).toBe(true);

    fireEvent.click(cases[1]); // Plomberie Diop
    fireEvent.click(bouton('Envoyer'));

    await waitFor(() => expect(envoyerRapportParMail).toHaveBeenCalledWith('rap-1', {
      exclure: ['plomberie@ex.fr'],
    }));
  });

  it('sans destinataire principal restant, l’envoi est impossible', async () => {
    await ouvrirEnvoi();

    const cases = screen.getAllByRole('checkbox');
    fireEvent.click(cases[0]);
    fireEvent.click(cases[1]);

    expect(bouton('Envoyer').disabled).toBe(true);
    fireEvent.click(bouton('Envoyer'));
    expect(envoyerRapportParMail).not.toHaveBeenCalled();
  });

  it('un échec de préparation est expliqué, la modale se referme', async () => {
    preparerEnvoiRapport.mockRejectedValue(new Error('Rapport introuvable'));

    afficher();
    fireEvent.click(await screen.findByRole('button', { name: 'Envoyer par e-mail' }));

    await waitFor(() => expect(SwalCustom.error).toHaveBeenCalled());
    expect(envoyerRapportParMail).not.toHaveBeenCalled();
  });

  it('un échec d’envoi est affiché sans faire disparaître le formulaire', async () => {
    envoyerRapportParMail.mockRejectedValue(new Error('Adresse invalide'));

    await ouvrirEnvoi();
    fireEvent.click(bouton('Envoyer'));

    await waitFor(() => expect(SwalCustom.error).toHaveBeenCalled());
    expect(screen.getByText(ENVOI.objet)).toBeTruthy();
  });
});
