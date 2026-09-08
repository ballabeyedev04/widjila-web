import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../i18n/index.js';

import PlateformeDemandes from './PlateformeDemandes.jsx';
import {
  listerDemandesInscription, validerDemandeInscription, rejeterDemandeInscription,
} from '../../service/admin/adminService.js';

/**
 * Demandes d'inscription — la première des deux files d'attente du super-admin.
 *
 * Ce que ces tests protègent en priorité :
 *
 *   - le REJET exige un motif d'au moins 5 caractères, le même seuil que le
 *     schéma Joi du serveur. Sans lui, le demandeur reçoit un courriel de refus
 *     vide et ne sait pas quoi corriger ;
 *   - la validation ne peut pas produire un SUPER-ADMIN. Une inscription
 *     publique qui donnerait les pleins pouvoirs serait une élévation de
 *     privilèges ; le serveur le refuse, l'écran ne doit pas le proposer.
 */

vi.mock('../../service/admin/adminService.js', () => ({
  listerDemandesInscription: vi.fn(),
  validerDemandeInscription: vi.fn(),
  rejeterDemandeInscription: vi.fn(),
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

const demande = {
  id: 'd1',
  prenom: 'Aminata',
  nom: 'Fall',
  email: 'aminata@exemple.test',
  telephone: '+221 77 000 00 00',
  role: 'ChefChantier',
  statut: 'en_attente_validation',
  createdAt: '2026-09-01T09:00:00.000Z',
  organisation: { nom: 'Sen BTP', ville: 'Dakar' },
};

const champMotif = () => screen.getByRole('textbox', { name: /Motif du rejet/ });

describe('PlateformeDemandes', () => {
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    listerDemandesInscription.mockResolvedValue({ items: [demande], total: 1 });
  });

  it('liste les demandes en attente avec leur demandeur', async () => {
    render(<PlateformeDemandes />);

    expect(await screen.findByText('aminata@exemple.test')).toBeTruthy();
    expect(screen.getByText('Sen BTP')).toBeTruthy();
  });

  it('interroge le serveur sur le statut « en attente » par défaut', async () => {
    // L'écran s'ouvre sur le travail à faire, pas sur l'historique.
    render(<PlateformeDemandes />);

    await waitFor(() => expect(listerDemandesInscription).toHaveBeenCalled());
    expect(listerDemandesInscription.mock.calls[0][0]).toMatchObject({
      statut: 'en_attente_validation',
    });
  });

  it('annonce une file vide sans laisser croire à une panne', async () => {
    listerDemandesInscription.mockResolvedValue({ items: [], total: 0 });

    render(<PlateformeDemandes />);

    expect(await screen.findByText('Aucune demande')).toBeTruthy();
  });

  describe('validation', () => {
    it('valide la demande à la confirmation', async () => {
      validerDemandeInscription.mockResolvedValue({});
      render(<PlateformeDemandes />);

      fireEvent.click(await screen.findByRole('button', { name: /Valider/ }));
      fireEvent.click(await screen.findByRole('button', { name: /Valider et envoyer/ }));

      await waitFor(() => expect(validerDemandeInscription).toHaveBeenCalledWith('d1', undefined));
    });

    it('ne propose JAMAIS le rôle « Admin »', async () => {
      // Le serveur refuse (demandeInscription.validation.js) : une inscription
      // publique ne peut pas produire un super-admin. L'interface ne doit pas
      // promettre ce qui sera rejeté — et surtout pas cette promesse-là.
      render(<PlateformeDemandes />);

      fireEvent.click(await screen.findByRole('button', { name: /Valider/ }));

      const options = await screen.findAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      expect(options.map((o) => o.value)).not.toContain('Admin');
    });

    it('transmet le rôle choisi quand l’admin en change', async () => {
      validerDemandeInscription.mockResolvedValue({});
      render(<PlateformeDemandes />);

      fireEvent.click(await screen.findByRole('button', { name: /Valider/ }));
      const select = await screen.findByRole('combobox');
      const autre = [...select.options].map((o) => o.value).find((v) => v && v !== demande.role);
      fireEvent.change(select, { target: { value: autre } });
      fireEvent.click(screen.getByRole('button', { name: /Valider et envoyer/ }));

      await waitFor(() => expect(validerDemandeInscription).toHaveBeenCalledWith('d1', autre));
    });
  });

  describe('rejet', () => {
    it('refuse un motif trop court sans appeler le serveur', async () => {
      render(<PlateformeDemandes />);

      fireEvent.click(await screen.findByRole('button', { name: 'Rejeter' }));
      fireEvent.change(champMotif(), { target: { value: 'non' } });
      fireEvent.click(screen.getByRole('button', { name: /Rejeter et envoyer/ }));

      // Le message d'erreur du champ, pas le libellé ni l'intro : c'est lui
      // qui dit à l'admin POURQUOI son rejet n'est pas parti.
      await screen.findByText('Le motif est obligatoire (5 caractères minimum).');
      expect(rejeterDemandeInscription).not.toHaveBeenCalled();
    });

    it('envoie le motif une fois qu’il est renseigné', async () => {
      rejeterDemandeInscription.mockResolvedValue({});
      render(<PlateformeDemandes />);

      fireEvent.click(await screen.findByRole('button', { name: 'Rejeter' }));
      fireEvent.change(champMotif(), {
        target: { value: "  L'entreprise déclarée n'est pas enregistrée.  " },
      });
      fireEvent.click(screen.getByRole('button', { name: /Rejeter et envoyer/ }));

      // Le motif part DÉTOURÉ : il est recopié tel quel dans le courriel.
      await waitFor(() =>
        expect(rejeterDemandeInscription).toHaveBeenCalledWith(
          'd1',
          "L'entreprise déclarée n'est pas enregistrée."
        )
      );
    });
  });

  it('affiche un accès refusé plutôt qu’une liste vide sur 403', async () => {
    // Un 403 n'est pas « aucune donnée » : le distinguer évite qu'un défaut de
    // droits passe pour une file d'attente vide.
    const err = new Error('interdit');
    err.response = { status: 403, data: { message: 'Réservé au super-admin.' } };
    listerDemandesInscription.mockRejectedValue(err);

    render(<PlateformeDemandes />);

    expect(await screen.findByText(/Accès refusé/)).toBeTruthy();
  });
});
