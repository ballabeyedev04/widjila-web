import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import i18n from '../../i18n/index.js';

import NouvelleReserveModal from './NouvelleReserveModal.jsx';
import { creerReserve, ajouterMedia } from '../../service/reserve/reserveService.js';

/**
 * Le formulaire ouvert par un clic sur un plan.
 *
 * Ce que ces tests verrouillent :
 *
 *   1. LES QUATRE CHAMPS OBLIGATOIRES du cahier technique § 9 — titre, phase,
 *      entreprise, échéance — et le fait qu'ils soient signalés TOUS ENSEMBLE.
 *      Les traiter l'un après l'autre faisait remplir le formulaire en autant
 *      d'allers-retours, chacun révélant le manque suivant. Entreprise et
 *      échéance étaient purement facultatives côté web : une réserve sans
 *      entreprise n'est adressée à personne, une réserve sans échéance n'est
 *      jamais en retard et sort donc de tout suivi.
 *   2. LA PAGE du plan part avec la position. Sans elle, les repères d'un PDF
 *      multi-pages se redessinent tous sur la première.
 *   3. LA LOCALISATION N'EST PAS RESSAISIE : seul `planId` est envoyé quand le
 *      parcours vient de l'explorateur — le serveur en déduit bâtiment, étage
 *      et zone.
 */

vi.mock('../../service/reserve/reserveService.js', () => ({
  creerReserve: vi.fn(),
  ajouterMedia: vi.fn(),
}));

vi.mock('../../hooks/useCorpsEtatActifs.js', () => ({
  useCorpsEtatActifs: () => ({ corpsEtat: [{ id: 'ce1', nom: 'Peinture' }], chargement: false }),
}));

vi.mock('../../hooks/usePhasesActives.js', () => ({
  usePhasesActives: () => ({ phases: [{ id: 'ph1', nom: 'Gros œuvre' }], chargement: false }),
}));

vi.mock('../../hooks/useEnums.js', () => ({
  useEnum: () => ['faible', 'moyenne', 'haute', 'critique'],
}));

vi.mock('../../utils/swal.config.js', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn(), confirm: vi.fn() },
}));

const PLAN = { id: 'p-1', nom: 'Appartement A201' };
const ENTREPRISES = [{ id: 'ent-1', nom: 'SARL Toiture' }];

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

beforeEach(() => {
  vi.clearAllMocks();
  creerReserve.mockResolvedValue({ id: 'r-1' });
});

const afficher = (props = {}) => render(
  <NouvelleReserveModal
    open
    onClose={() => {}}
    chantierId="c1"
    localisation={{ plan: PLAN, chemin: 'Résidence Horizon › Plan de masse' }}
    position={{ x: 10, y: 20, page: 3 }}
    entreprises={ENTREPRISES}
    onCreee={() => {}}
    {...props}
  />,
);

const enregistrer = () => screen.getByRole('button', { name: /Enregistrer/i });

/** Remplit les quatre champs obligatoires. */
const remplirTout = () => {
  fireEvent.change(screen.getByLabelText(/Titre/i), { target: { value: 'Fissure' } });
  fireEvent.change(screen.getByLabelText(/Phase/i), { target: { value: 'ph1' } });
  fireEvent.change(screen.getByLabelText(/Entreprise/i), { target: { value: 'ent-1' } });
  fireEvent.change(screen.getByLabelText(/Délai|Échéance/i), { target: { value: '2026-12-31' } });
};

// ── 1. Les champs obligatoires ──────────────────────────────────────────────

describe('champs obligatoires', () => {
  it('signale les quatre manques D’UN SEUL COUP, sans rien envoyer', async () => {
    afficher();
    fireEvent.click(enregistrer());

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBe(4));
    expect(creerReserve).not.toHaveBeenCalled();
  });

  it('refuse une réserve sans ENTREPRISE — elle ne serait adressée à personne', async () => {
    afficher();
    fireEvent.change(screen.getByLabelText(/Titre/i), { target: { value: 'Fissure' } });
    fireEvent.change(screen.getByLabelText(/Phase/i), { target: { value: 'ph1' } });
    fireEvent.change(screen.getByLabelText(/Délai|Échéance/i), { target: { value: '2026-12-31' } });

    fireEvent.click(enregistrer());

    await waitFor(() => expect(screen.getByText(/Désignez l’entreprise/i)).toBeTruthy());
    expect(creerReserve).not.toHaveBeenCalled();
  });

  it('refuse une réserve sans ÉCHÉANCE — elle ne serait jamais en retard', async () => {
    afficher();
    fireEvent.change(screen.getByLabelText(/Titre/i), { target: { value: 'Fissure' } });
    fireEvent.change(screen.getByLabelText(/Phase/i), { target: { value: 'ph1' } });
    fireEvent.change(screen.getByLabelText(/Entreprise/i), { target: { value: 'ent-1' } });

    fireEvent.click(enregistrer());

    await waitFor(() => expect(screen.getByText(/Fixez une échéance/i)).toBeTruthy());
    expect(creerReserve).not.toHaveBeenCalled();
  });
});

// ── 2. Ce qui part au serveur ───────────────────────────────────────────────

describe('envoi', () => {
  it('transmet le plan, le point ET la page affichée', async () => {
    afficher();
    remplirTout();
    fireEvent.click(enregistrer());

    await waitFor(() => expect(creerReserve).toHaveBeenCalled());
    const [chantierId, corps] = creerReserve.mock.calls[0];
    expect(chantierId).toBe('c1');
    expect(corps.planId).toBe('p-1');
    expect(corps.position).toEqual({ x: 10, y: 20, zoom: 1, page: 3 });
  });

  it('n’envoie NI bâtiment NI étage NI zone : le serveur les déduit du plan', async () => {
    afficher();
    remplirTout();
    fireEvent.click(enregistrer());

    await waitFor(() => expect(creerReserve).toHaveBeenCalled());
    const [, corps] = creerReserve.mock.calls[0];
    expect(corps.batimentId).toBeUndefined();
    expect(corps.etageId).toBeUndefined();
    expect(corps.zoneId).toBeUndefined();
  });

  it('affiche la descente du parcours à la place de la structure', async () => {
    afficher();

    expect(screen.getByText('Résidence Horizon › Plan de masse')).toBeTruthy();
  });

  it('la gravité pilote aussi la priorité — un seul curseur, comme le guide', async () => {
    afficher();
    remplirTout();
    fireEvent.change(screen.getByLabelText(/Gravité/i), { target: { value: 'critique' } });
    fireEvent.click(enregistrer());

    await waitFor(() => expect(creerReserve).toHaveBeenCalled());
    const [, corps] = creerReserve.mock.calls[0];
    expect(corps.severite).toBe('critique');
    expect(corps.priorite).toBe('critique');
  });

  it('sans photo choisie, aucun second appel n’est tenté', async () => {
    afficher();
    remplirTout();
    fireEvent.click(enregistrer());

    await waitFor(() => expect(creerReserve).toHaveBeenCalled());
    expect(ajouterMedia).not.toHaveBeenCalled();
  });
});
