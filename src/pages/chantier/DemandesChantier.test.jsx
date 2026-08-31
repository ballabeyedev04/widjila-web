import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import DemandesChantier from './DemandesChantier.jsx';
import { listerChantiers, rejeterChantier } from '../../service/chantier/chantierService.js';

vi.mock('../../service/chantier/chantierService.js', () => ({
  listerChantiers: vi.fn(),
  validerChantier: vi.fn(),
  rejeterChantier: vi.fn(),
}));

// SweetAlert ouvre une vraie modale : inutile et bruyant en test.
vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), toast: vi.fn(), confirm: vi.fn() },
}));

const demande = {
  id: 'c1',
  nom: 'Résidence Les Filaos',
  code: 'CH-A1B2',
  statut: 'en_attente_validation',
  createdAt: '2026-08-30T10:00:00.000Z',
  demandeur: { prenom: 'Moussa', nom: 'Diop', email: 'moussa@exemple.test' },
};

const afficher = () =>
  render(
    <MemoryRouter>
      <DemandesChantier />
    </MemoryRouter>
  );

/** Le champ de motif, désigné par son libellé plutôt que par sa position. */
const champMotif = () => screen.getByRole('textbox', { name: /Motif du refus/ });

describe('DemandesChantier', () => {
  // Sans navigateur ni préférence stockée, le détecteur retombe sur l'anglais.
  // On fixe le français : les libellés attendus sont ceux de la langue
  // principale du produit, et l'assertion ne dépend plus du détecteur.
  beforeAll(() => i18n.changeLanguage('fr'));

  beforeEach(() => {
    vi.clearAllMocks();
    listerChantiers.mockResolvedValue({ items: [demande], total: 1 });
  });

  it('demande au serveur la FILE À VALIDER, pas la liste des chantiers', async () => {
    // Le serveur écarte les demandes par défaut : sans le paramètre
    // `demandes`, cet écran afficherait toujours « aucune demande ».
    afficher();

    await waitFor(() => expect(listerChantiers).toHaveBeenCalled());
    expect(listerChantiers).toHaveBeenCalledWith(
      expect.objectContaining({ demandes: 'a_valider' })
    );
  });

  it('bascule sur les demandes du compte connecté', async () => {
    afficher();
    await screen.findByText('Résidence Les Filaos');

    fireEvent.click(screen.getByRole('button', { name: 'Mes demandes' }));

    await waitFor(() =>
      expect(listerChantiers).toHaveBeenLastCalledWith(
        expect.objectContaining({ demandes: 'mes' })
      )
    );
  });

  it('montre le demandeur — on ne tranche pas une demande anonyme', async () => {
    afficher();

    expect(await screen.findByText('Moussa Diop')).toBeTruthy();
    expect(screen.getByText('moussa@exemple.test')).toBeTruthy();
  });

  it('refuse d’envoyer un motif trop court, sans appeler le serveur', async () => {
    // Le seuil est celui du schéma Joi. Le vérifier ici évite un aller-retour,
    // mais surtout la requête ne doit PAS partir.
    afficher();
    await screen.findByText('Résidence Les Filaos');

    fireEvent.click(screen.getByRole('button', { name: /Refuser$/ }));
    fireEvent.change(champMotif(), { target: { value: 'trop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refuser la demande' }));

    await waitFor(() => expect(screen.getByText(/Précisez le motif/)).toBeTruthy());
    expect(rejeterChantier).not.toHaveBeenCalled();
  });

  it('envoie le motif ÉLAGUÉ une fois assez long', async () => {
    afficher();
    await screen.findByText('Résidence Les Filaos');

    fireEvent.click(screen.getByRole('button', { name: /Refuser$/ }));
    fireEvent.change(champMotif(), {
      target: { value: '  Adresse incomplète, plan du R+2 manquant.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refuser la demande' }));

    await waitFor(() =>
      expect(rejeterChantier).toHaveBeenCalledWith(
        'c1',
        'Adresse incomplète, plan du R+2 manquant.'
      )
    );
  });

  it('affiche le motif d’un refus, avec le chemin pour corriger', async () => {
    // C'est la seule indication dont dispose le demandeur : elle doit être
    // lisible sans ouvrir de modale.
    listerChantiers.mockResolvedValue({
      items: [{ ...demande, statut: 'rejete', motif_rejet: 'Adresse incomplète.' }],
      total: 1,
    });

    afficher();

    expect(await screen.findByText(/Adresse incomplète\./)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Corriger et renvoyer' })).toBeTruthy();
  });

  it('distingue la file vide du suivi vide', async () => {
    // Deux messages différents : « rien à valider » et « vous n'avez rien
    // déposé » n'appellent pas la même action.
    listerChantiers.mockResolvedValue({ items: [], total: 0 });

    afficher();

    expect(await screen.findByText('Aucune demande en attente')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mes demandes' }));

    expect(await screen.findByText('Aucune demande de votre part')).toBeTruthy();
  });
});
