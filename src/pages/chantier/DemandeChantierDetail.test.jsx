import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import DemandeChantierDetail from './DemandeChantierDetail.jsx';
import { getChantier, validerChantier } from '../../service/chantier/chantierService.js';
import { listerPlans } from '../../service/plan/planService.js';

/**
 * L'écran où le super-admin valide un chantier AVEC SES PLANS.
 *
 * Il n'avait aucun test, et il portait deux défauts que ces tests figent :
 *
 *   1. Des plans DÉPOSÉS n'étaient jamais affichés — un seul plan par niveau,
 *      rien pour les plans de bâtiment, rien pour les plans de zone ni les
 *      plans de détail. Le valideur tranchait sans avoir tout vu.
 *   2. La validation partait au PREMIER clic, sans confirmation, alors que le
 *      chantier devient actif et que son demandeur reçoit un courriel.
 */

vi.mock('../../service/chantier/chantierService.js', () => ({
  getChantier: vi.fn(),
  validerChantier: vi.fn(),
  rejeterChantier: vi.fn(),
}));

vi.mock('../../service/plan/planService.js', () => ({
  listerPlans: vi.fn(),
  fetchFichierBlob: vi.fn(),
}));

// SweetAlert ouvre une vraie modale : inutile et bruyant en test.
vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

// `PlanCanvas` charge pdf.js et son worker : hors sujet ici, et coûteux.
vi.mock('../../components/plan/PlanCanvas.jsx', () => ({
  default: () => <div data-testid="plan-canvas" />,
}));

/** Un plan, avec le strict nécessaire pour être classé et affiché. */
const plan = (nom, rattachement = {}) => ({
  id: `plan-${nom}`,
  nom,
  format: 'pdf',
  version: 1,
  is_current: true,
  fichier_url: `/uploads/plans/${nom}.pdf`,
  batimentId: null,
  etageId: null,
  zoneId: null,
  parentId: null,
  ...rattachement,
});

const chantier = {
  id: 'c1',
  nom: 'Résidence Les Filaos',
  code: 'CH-A1B2',
  statut: 'en_attente_validation',
  createdAt: '2026-08-30T10:00:00.000Z',
  demandeur: { prenom: 'Moussa', nom: 'Diop', email: 'moussa@exemple.test' },
  batiments: [
    {
      id: 'bat-1',
      nom: 'Bloc A',
      etages: [
        { id: 'niv-ss', nom: 'Sous-sol 1', typeNiveau: 'sous_sol' },
        { id: 'niv-1', nom: 'R+1', typeNiveau: 'etage' },
        { id: 'niv-2', nom: 'R+2', typeNiveau: 'etage' },
      ],
    },
  ],
};

const afficher = () =>
  render(
    <MemoryRouter initialEntries={['/chantiers/demandes/c1']}>
      <Routes>
        <Route path="/chantiers/demandes/:id" element={<DemandeChantierDetail />} />
      </Routes>
    </MemoryRouter>
  );

/** Les lignes ouvrables — une par plan effectivement présenté au valideur. */
const boutonsExaminer = () => screen.queryAllByRole('button', { name: /Examiner/ });

describe('DemandeChantierDetail', () => {
  // Sans navigateur ni préférence stockée, le détecteur retombe sur l'anglais.
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    getChantier.mockResolvedValue(chantier);
    listerPlans.mockResolvedValue([]);
  });

  it('affiche le chantier et son demandeur', async () => {
    afficher();

    expect(await screen.findByText('Résidence Les Filaos')).toBeTruthy();
    expect(screen.getByText('moussa@exemple.test')).toBeTruthy();
  });

  describe('les plans déposés', () => {
    it('montre TOUS les plans d’un même niveau, pas seulement le premier', async () => {
      // Le défaut d'origine : `plans.find(p => p.etageId === id)` s'arrêtait au
      // premier. Un niveau qui portait l'architecture ET l'électricité n'en
      // montrait qu'une — et rien ne le signalait.
      listerPlans.mockResolvedValue([
        plan('Architecture R+1', { etageId: 'niv-1', batimentId: 'bat-1' }),
        plan('Électricité R+1', { etageId: 'niv-1', batimentId: 'bat-1' }),
      ]);

      afficher();

      await waitFor(() => expect(boutonsExaminer()).toHaveLength(2));
      expect(screen.getByText(/Architecture R\+1/)).toBeTruthy();
      expect(screen.getByText(/Électricité R\+1/)).toBeTruthy();
    });

    it('montre les plans rattachés au BÂTIMENT, qui n’apparaissaient nulle part', async () => {
      // Ni globaux (ils ont un `batimentId`) ni portés par un niveau : cette
      // famille entière était invisible.
      listerPlans.mockResolvedValue([plan('Façade nord', { batimentId: 'bat-1' })]);

      afficher();

      expect(await screen.findByText('PLANS DU BÂTIMENT')).toBeTruthy();
      expect(screen.getByText('Façade nord')).toBeTruthy();
      expect(boutonsExaminer()).toHaveLength(1);
    });

    it('rattrape les plans de ZONE et de DÉTAIL dans « Autres plans déposés »', async () => {
      // Le filet de sécurité : ce qu'aucune section ne réclame doit rester
      // visible, sans quoi le valideur juge un dossier amputé.
      listerPlans.mockResolvedValue([
        plan('Appartement A12', { zoneId: 'zone-1' }),
        plan('Détail escalier', { parentId: 'plan-Plan de masse' }),
      ]);

      afficher();

      expect(await screen.findByText('Autres plans déposés')).toBeTruthy();
      expect(screen.getByText('Appartement A12')).toBeTruthy();
      expect(screen.getByText('Détail escalier')).toBeTruthy();
    });

    it('ne garde qu’UNE version par plan — celle marquée courante', async () => {
      // Le serveur renvoie toutes les révisions, triées version DESC. Les
      // afficher toutes montrerait trois fois le même plan sans dire lequel
      // fait foi.
      listerPlans.mockResolvedValue([
        { ...plan('Architecture R+1', { etageId: 'niv-1' }), id: 'v2', version: 2, is_current: true },
        { ...plan('Architecture R+1', { etageId: 'niv-1' }), id: 'v1', version: 1, is_current: false },
      ]);

      afficher();

      await waitFor(() => expect(boutonsExaminer()).toHaveLength(1));
    });

    it('signale les niveaux SANS plan au lieu de les taire', async () => {
      // Un trou dans le dossier est une information pour le valideur : c'est
      // souvent le motif du refus.
      listerPlans.mockResolvedValue([plan('Architecture R+1', { etageId: 'niv-1' })]);

      afficher();

      // Deux niveaux sur trois n'ont rien : le sous-sol et le R+2.
      await waitFor(() => expect(screen.getAllByText('Plan non fourni')).toHaveLength(2));
    });

    it('affiche le plan global du chantier', async () => {
      listerPlans.mockResolvedValue([plan('Plan de masse')]);

      afficher();

      expect(await screen.findByText('Plan de masse')).toBeTruthy();
      expect(screen.queryByText('Aucun plan global déposé.')).toBeNull();
    });

    it('dit clairement qu’aucun plan global n’a été déposé', async () => {
      afficher();

      expect(await screen.findByText('Aucun plan global déposé.')).toBeTruthy();
    });
  });

  describe('la validation', () => {
    it('demande confirmation avant de valider', async () => {
      afficher();

      fireEvent.click(await screen.findByRole('button', { name: /Valider/ }));

      // Rien n'est parti : la modale s'ouvre d'abord.
      expect(validerChantier).not.toHaveBeenCalled();
      expect(await screen.findByText(/deviendra actif/)).toBeTruthy();
    });

    it('valide une fois la confirmation donnée', async () => {
      validerChantier.mockResolvedValue({});
      afficher();

      fireEvent.click(await screen.findByRole('button', { name: /Valider/ }));
      fireEvent.click(await screen.findByRole('button', { name: /Valider le chantier/ }));

      await waitFor(() => expect(validerChantier).toHaveBeenCalledWith('c1'));
    });

    it('annuler referme la modale sans rien envoyer', async () => {
      afficher();

      fireEvent.click(await screen.findByRole('button', { name: /Valider/ }));
      fireEvent.click(await screen.findByRole('button', { name: /Annuler/ }));

      await waitFor(() => expect(screen.queryByText(/deviendra actif/)).toBeNull());
      expect(validerChantier).not.toHaveBeenCalled();
    });

    it('n’offre pas de valider un chantier déjà traité', async () => {
      getChantier.mockResolvedValue({ ...chantier, statut: 'actif' });

      afficher();

      await screen.findByText('Résidence Les Filaos');
      expect(screen.queryByRole('button', { name: /Valider/ })).toBeNull();
    });
  });

  it('propose de réessayer quand le chargement échoue', async () => {
    // Une panne réseau ne doit pas ressembler à un dossier vide.
    getChantier.mockRejectedValue(new Error('réseau'));

    afficher();

    expect(await screen.findByRole('button', { name: /Réessayer/ })).toBeTruthy();
  });
});
