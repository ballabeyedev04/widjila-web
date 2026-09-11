import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import PlateformeDashboard from './PlateformeDashboard.jsx';
import { statsPlateforme, croissanceInscriptions } from '../../service/admin/adminService.js';

/**
 * Écran d'accueil du super-admin.
 *
 * Il rendait `null` quand les statistiques ne chargeaient pas : une alerte
 * passait, puis une PAGE BLANCHE — sans cause, sans bouton pour réessayer,
 * sur le premier écran vu après la connexion. Ces tests figent le contraire.
 */

vi.mock('../../service/admin/adminService.js', () => ({
  statsPlateforme: vi.fn(),
  croissanceInscriptions: vi.fn(),
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

const STATS = {
  organisations: 12,
  utilisateurs: 87,
  chantiers: 30,
  chantiersActifs: 24,
  reserves: 412,
  reservesOuvertes: 57,
  aValider: { inscriptions: 3, chantiers: 2, plans: 5 },
  rejetes: { chantiers: 1, inscriptions: 4 },
  parAbonnement: { pro: 8, essai: 4 },
  reservesParStatut: { creee: 20, validee: 30 },
};

const afficher = () =>
  render(
    <MemoryRouter>
      <PlateformeDashboard />
    </MemoryRouter>
  );

describe('PlateformeDashboard', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    statsPlateforme.mockResolvedValue(STATS);
    croissanceInscriptions.mockResolvedValue({ croissance: [{ mois: '2026-08', inscriptions: 6 }] });
  });

  it('ouvre sur le travail en attente, pas sur les volumes', async () => {
    // Ce compte ne crée rien : son métier est de trancher, et des gens
    // attendent la réponse à l'autre bout.
    afficher();

    expect(await screen.findByText('3')).toBeTruthy(); // inscriptions à valider
    expect(screen.getByText('5')).toBeTruthy(); // plans à vérifier
  });

  describe('quand le chargement échoue', () => {
    it('affiche l’erreur et un bouton pour réessayer — jamais une page blanche', async () => {
      statsPlateforme.mockRejectedValue(new Error('serveur injoignable'));

      const { container } = afficher();

      const reessayer = await screen.findByRole('button', { name: /Réessayer/ });
      expect(reessayer).toBeTruthy();
      expect(container.textContent.trim()).not.toBe('');
    });

    it('relance le chargement au clic sur Réessayer', async () => {
      statsPlateforme.mockRejectedValueOnce(new Error('serveur injoignable'));

      afficher();

      fireEvent.click(await screen.findByRole('button', { name: /Réessayer/ }));

      // La seconde tentative aboutit : l'écran se remplit.
      await waitFor(() => expect(statsPlateforme).toHaveBeenCalledTimes(2));
      expect(await screen.findByText('3')).toBeTruthy();
    });

    it('nomme un refus de droits pour ce qu’il est', async () => {
      // Un 403 n'est pas une panne. Confondre les deux envoie chercher un
      // incident serveur là où il n'y a qu'une habilitation manquante.
      const err = new Error('interdit');
      err.response = { status: 403, data: { message: 'Réservé au super-admin.' } };
      statsPlateforme.mockRejectedValue(err);

      afficher();

      expect(await screen.findByText(/Accès refusé/)).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Réessayer/ })).toBeNull();
    });
  });

  it('survit à la panne de la seule courbe de croissance', async () => {
    // La courbe est un ornement ; les files d'attente sont le travail. Un
    // `Promise.all` les liait : l'échec de l'ornement emportait la page.
    croissanceInscriptions.mockRejectedValue(new Error('timeout'));

    afficher();

    expect(await screen.findByText('3')).toBeTruthy();
  });

  it('une courbe en PANNE ne se fait pas passer pour une courbe VIDE', async () => {
    // Défaut corrigé : l'échec de la requête affichait « Aucune inscription »
    // — une absence de données — là où il y avait une erreur. Le
    // super-admin concluait à zéro inscription, sans moyen de réessayer.
    croissanceInscriptions.mockRejectedValue(new Error('timeout'));

    afficher();

    expect(await screen.findByText('3')).toBeTruthy();
    expect(screen.queryByText(/Aucune inscription/)).toBeNull();
    expect(screen.getByRole('button', { name: /Réessayer/ })).toBeTruthy();
  });

  it('une courbe réellement vide affiche bien « Aucune inscription »', async () => {
    croissanceInscriptions.mockResolvedValue({ croissance: [] });

    afficher();

    expect(await screen.findByText(/Aucune inscription/)).toBeTruthy();
  });
});
