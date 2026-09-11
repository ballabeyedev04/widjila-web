import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import Chantiers from './Chantiers.jsx';
import { listerChantiers } from '../../service/chantier/chantierService.js';

/**
 * La liste des chantiers — et surtout la façon d'en obtenir un.
 *
 * Ce que ces tests verrouillent :
 *
 *   1. CRÉER UN CHANTIER, C'EST DÉPOSER UNE DEMANDE, et une demande commence
 *      par les PLANS. Le bouton ouvrait un formulaire et appelait
 *      `POST /chantiers` : l'appel est correct, mais côté serveur toute
 *      création par un compte non super-admin naît « en attente de validation »
 *      (`chantier.service.js#_naitEnAttente`). L'écran annonçait donc « Nouveau
 *      chantier » puis « Créer » pour produire une demande — qui disparaissait
 *      aussitôt de cette liste, le serveur y écartant les demandes. On croyait
 *      avoir raté la création.
 *   2. LE GROUPE DE RÔLES est celui du serveur (`DEPOSANT`), pas celui de la
 *      gestion opérationnelle : le maître d'ouvrage dépose des demandes sans
 *      conduire de chantier.
 *   3. L'ÉTAT VIDE propose le même chemin — c'est là qu'on cherche par où
 *      commencer, et il n'y proposait rien.
 */

const navigate = vi.fn();
vi.mock('react-router-dom', async (original) => ({
  ...(await original()),
  useNavigate: () => navigate,
}));

vi.mock('../../service/chantier/chantierService.js', () => ({
  listerChantiers: vi.fn(),
  modifierChantier: vi.fn(),
  supprimerChantier: vi.fn(),
  dupliquerChantier: vi.fn(),
}));

vi.mock('../../hooks/useEnums.js', () => ({
  useEnum: () => ['en_preparation', 'en_cours', 'archive'],
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), confirm: vi.fn() },
}));

let role = 'Entreprise';
vi.mock('../../context/useUser.js', () => ({
  useUser: () => ({ user: { id: 'u1', role } }),
}));

const CHANTIER = {
  id: 'c1', nom: 'Résidence Horizon', code: 'CH-0001', statut: 'en_cours',
};

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

beforeEach(() => {
  vi.clearAllMocks();
  role = 'Entreprise';
  listerChantiers.mockResolvedValue({ items: [CHANTIER], total: 1 });
});

const afficher = () => render(<MemoryRouter><Chantiers /></MemoryRouter>);

const boutonDemander = () => screen.queryByRole('button', { name: /Demander un chantier/i });

// ── 1. Le parcours de création ──────────────────────────────────────────────

describe('demander un chantier', () => {
  it('mène au dépôt de plans, et non à un formulaire', async () => {
    afficher();
    await waitFor(() => expect(boutonDemander()).toBeTruthy());

    fireEvent.click(boutonDemander());

    expect(navigate).toHaveBeenCalledWith('/depot-plans');
  });

  it('n’ouvre AUCUNE modale de création', async () => {
    afficher();
    await waitFor(() => expect(boutonDemander()).toBeTruthy());

    fireEvent.click(boutonDemander());

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// ── 2. Qui peut demander ────────────────────────────────────────────────────

describe('groupe de rôles', () => {
  it('le maître d’ouvrage peut demander, comme sur mobile', async () => {
    role = 'MaitreOuvrage';
    afficher();

    await waitFor(() => expect(boutonDemander()).toBeTruthy());
  });

  it('le client, non : le serveur lui refuserait la demande', async () => {
    role = 'Client';
    afficher();

    await waitFor(() => expect(listerChantiers).toHaveBeenCalled());
    expect(boutonDemander()).toBeNull();
  });

  it('le super-admin plateforme ne crée pas de chantier chez un client', async () => {
    role = 'Admin';
    afficher();

    await waitFor(() => expect(listerChantiers).toHaveBeenCalled());
    expect(boutonDemander()).toBeNull();
  });
});

// ── 3. L'état vide ──────────────────────────────────────────────────────────

describe('aucun chantier', () => {
  it('propose le dépôt plutôt que de renvoyer ailleurs', async () => {
    listerChantiers.mockResolvedValue({ items: [], total: 0 });
    afficher();

    // Deux boutons portent le même libellé : celui de l'en-tête et celui de
    // l'état vide. C'est voulu — on cherche par où commencer À L'ENDROIT où
    // l'on constate qu'il n'y a rien.
    await waitFor(() => expect(
      screen.getAllByRole('button', { name: /Demander un chantier/i }).length,
    ).toBe(2));
  });
});
