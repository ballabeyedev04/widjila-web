import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import i18n from '../../i18n/index.js';

import PlanExplorer from './PlanExplorer.jsx';
import {
  getPlan, listerPlansRacines, listerSousPlans, fetchFichierBlob,
} from '../../service/plan/planService.js';

/**
 * L'explorateur de plans — le parcours de relevé du mobile, porté au web.
 *
 * Ce que ces tests verrouillent, dans l'ordre de ce qui coûte le plus cher si
 * ça casse :
 *
 *   1. LA DESCENTE EST BORNÉE PAR LE SERVEUR. Chaque niveau n'affiche que les
 *      enfants DIRECTS du plan ouvert, et les sous-plans ne sont demandés que
 *      lorsque le compteur du serveur en annonce. Si l'écran repartait d'une
 *      liste à plat filtrée localement, il rechargerait tout le chantier à
 *      chaque cran — exactement le défaut que ce parcours corrige.
 *   2. UN CLIC SUR LE PLAN CRÉE UNE RÉSERVE À CET ENDROIT, avec le plan, le
 *      point ET LA PAGE affichée. Sans la page, les repères d'un PDF de douze
 *      pages se redessinent tous sur la première : chacun à ses bonnes
 *      coordonnées, sur la mauvaise feuille. Un repère faux envoie constater un
 *      défaut là où il n'y en a pas.
 *   3. LA LOCALISATION N'EST PAS RESSAISIE. Bâtiment, étage et zone ne sont pas
 *      envoyés : le serveur les déduit du plan. Les renvoyer d'ici risquerait
 *      de le contredire.
 *   4. UN PLAN EN ATTENTE DE VALIDATION N'ACCEPTE RIEN. Le serveur refuse toute
 *      réserve dessus ; faire remplir un formulaire pour rien est pire que de
 *      ne pas le proposer.
 *   5. LA FLÈCHE REMONTE D'UN CRAN, elle ne referme pas tout le parcours depuis
 *      le fond de l'arborescence.
 */

vi.mock('../../service/plan/planService.js', () => ({
  getPlan: vi.fn(),
  listerPlansRacines: vi.fn(),
  listerSousPlans: vi.fn(),
  fetchFichierBlob: vi.fn(),
}));

vi.mock('../../service/organisation/organisationService.js', () => ({
  listerPartenairesChantier: vi.fn(() => Promise.resolve({ items: [] })),
}));

// Rôle d'intervention : c'est lui qui peut poser une réserve.
vi.mock('../../context/useUser.js', () => ({
  useUser: () => ({ user: { id: 'u1', role: 'Entreprise' } }),
}));

// L'aperçu télécharge et rend le document avec pdf.js : hors sujet ici, et
// jsdom ne sait pas le faire.
vi.mock('../../components/plan/PlanVignette.jsx', () => ({
  default: ({ className }) => <div className={className} data-vignette />,
}));

/**
 * Faux `PlanCanvas` : deux boutons qui déclenchent les deux gestes du vrai
 * composant, et un mouchard sur le mode et la page reçus.
 *
 * Le vrai monte pdf.js, mesure des rectangles et convertit des pixels en
 * pourcentages — rien de tout cela n'a de sens dans jsdom, et ce n'est pas ce
 * que cet écran-ci doit garantir. Ce qui compte ici, c'est ce que
 * l'explorateur FAIT du point qu'on lui remonte.
 */
vi.mock('../../components/plan/PlanCanvas.jsx', () => ({
  default: ({ mode, page, marqueurs, onPointClique, onMarqueurClique, onPagesConnues }) => (
    <div data-canvas data-mode={mode} data-page={page}>
      <button type="button" onClick={() => onPointClique?.(42.5, 61.25)}>zone-libre</button>
      <button type="button" onClick={() => onPagesConnues?.(3)}>annoncer-3-pages</button>
      {marqueurs.map((m) => (
        <button key={m.id} type="button" onClick={() => onMarqueurClique?.(m)}>
          {`repere:${m.id}`}
        </button>
      ))}
    </div>
  ),
}));

/** Capte les props reçues par le formulaire de création. */
const propsModale = vi.fn();
vi.mock('../../components/plan/NouvelleReserveModal.jsx', () => ({
  default: (props) => {
    propsModale(props);
    return props.open ? <div data-modale-reserve /> : null;
  },
}));

const PLAN_MASSE = {
  id: 'p-masse',
  chantierId: 'c1',
  nom: 'Plan de masse',
  version: 1,
  statut: 'actif',
  format: 'pdf',
  fichier_url: '/uploads/plans/masse.pdf',
  nombre_sous_plans: 2,
  nombre_reserves: 1,
};

const PLAN_FEUILLE = {
  id: 'p-a201',
  chantierId: 'c1',
  nom: 'Appartement A201',
  version: 2,
  statut: 'actif',
  format: 'pdf',
  fichier_url: '/uploads/plans/a201.pdf',
  nombre_sous_plans: 0,
  nombre_reserves: 0,
};

/** Le détail sert l'image ET les réserves positionnées. */
const DETAIL_MASSE = {
  ...PLAN_MASSE,
  reserves: [
    {
      id: 'r-1',
      numero: 'R-001',
      titre: 'Fissure en façade',
      description: 'Fissure horizontale sous la fenêtre.',
      statut: 'creee',
      severite: 'haute',
      position: { x: 12, y: 34, zoom: 1, page: 1 },
      createur: { id: 'u9', nom: 'Beye', prenom: 'Balla' },
      medias: [],
      createdAt: '2026-09-01T08:00:00.000Z',
    },
  ],
};

beforeAll(async () => {
  await i18n.changeLanguage('fr');
});

beforeEach(() => {
  vi.clearAllMocks();
  listerPlansRacines.mockResolvedValue({ items: [PLAN_MASSE], total: 1 });
  listerSousPlans.mockResolvedValue({ items: [PLAN_FEUILLE], total: 1 });
  getPlan.mockResolvedValue(DETAIL_MASSE);
  fetchFichierBlob.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
});

const afficher = (recherche = '?nom=R%C3%A9sidence%20Horizon') => render(
  <MemoryRouter initialEntries={[`/chantiers/c1/plans/explorer${recherche}`]}>
    <Routes>
      <Route path="/chantiers/:chantierId/plans/explorer" element={<PlanExplorer />} />
    </Routes>
  </MemoryRouter>,
);

const canvas = () => document.querySelector('[data-canvas]');

// ── 1. La descente, un cran à la fois ───────────────────────────────────────

describe('descente de l’arborescence', () => {
  it('n’affiche au départ que les plans globaux du chantier', async () => {
    afficher();

    expect(await screen.findByText('Plan de masse')).toBeTruthy();
    expect(listerPlansRacines).toHaveBeenCalledWith('c1');
    // Rien n'est ouvert : ni détail, ni sous-plans.
    expect(getPlan).not.toHaveBeenCalled();
    expect(listerSousPlans).not.toHaveBeenCalled();
  });

  it('annonce sur la tuile ce qu’elle porte, compté par le serveur', async () => {
    afficher();
    await screen.findByText('Plan de masse');

    expect(screen.getByText('2 sous-plans · 1 réserve')).toBeTruthy();
  });

  it('ouvrir un plan charge son détail et SES sous-plans directs', async () => {
    afficher();
    fireEvent.click(await screen.findByText('Plan de masse'));

    await waitFor(() => expect(getPlan).toHaveBeenCalledWith('p-masse'));
    expect(listerSousPlans).toHaveBeenCalledWith('p-masse');
    expect(await screen.findByText('Appartement A201')).toBeTruthy();
  });

  it('ne demande AUCUN sous-plan sur une feuille de l’arborescence', async () => {
    listerPlansRacines.mockResolvedValue({ items: [PLAN_FEUILLE], total: 1 });
    getPlan.mockResolvedValue({ ...PLAN_FEUILLE, reserves: [] });

    afficher();
    fireEvent.click(await screen.findByText('Appartement A201'));

    await waitFor(() => expect(getPlan).toHaveBeenCalledWith('p-a201'));
    expect(listerSousPlans).not.toHaveBeenCalled();
  });

  it('la flèche remonte d’un cran au lieu de refermer le parcours', async () => {
    afficher();
    fireEvent.click(await screen.findByText('Plan de masse'));
    await waitFor(() => expect(canvas()).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    // De retour aux plans globaux : la liste, et plus le plan ouvert.
    await waitFor(() => expect(canvas()).toBeNull());
    expect(listerPlansRacines).toHaveBeenCalledTimes(2);
  });
});

// ── 2. Le geste qui justifie tout le reste ──────────────────────────────────

describe('création d’une réserve depuis le plan', () => {
  it('un clic sur une zone libre ouvre le formulaire avec le plan, le point et la page', async () => {
    afficher();
    fireEvent.click(await screen.findByText('Plan de masse'));
    await waitFor(() => expect(canvas()).toBeTruthy());

    // Document de trois pages, on regarde la deuxième.
    fireEvent.click(screen.getByRole('button', { name: 'annoncer-3-pages' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Page suivante' }));
    await waitFor(() => expect(canvas().getAttribute('data-page')).toBe('2'));

    fireEvent.click(screen.getByRole('button', { name: 'zone-libre' }));

    await waitFor(() => expect(document.querySelector('[data-modale-reserve]')).toBeTruthy());
    const props = propsModale.mock.calls.at(-1)[0];
    expect(props.open).toBe(true);
    expect(props.chantierId).toBe('c1');
    expect(props.localisation.plan.id).toBe('p-masse');
    expect(props.position).toEqual({ x: 42.5, y: 61.25, page: 2 });
  });

  it('n’envoie NI bâtiment NI étage NI zone : le serveur les déduit du plan', async () => {
    afficher();
    fireEvent.click(await screen.findByText('Plan de masse'));
    await waitFor(() => expect(canvas()).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'zone-libre' }));

    const { localisation } = propsModale.mock.calls.at(-1)[0];
    expect(localisation.batiment).toBeUndefined();
    expect(localisation.etage).toBeUndefined();
    expect(localisation.zone).toBeUndefined();
    // La descente lisible remplace la structure dans l'encart de localisation.
    expect(localisation.chemin).toBe('Résidence Horizon › Plan de masse');
  });

  it('le point désigné est posé sur le plan tant que le formulaire est ouvert', async () => {
    afficher();
    fireEvent.click(await screen.findByText('Plan de masse'));
    await waitFor(() => expect(canvas()).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'zone-libre' }));

    expect(await screen.findByRole('button', { name: 'repere:__provisoire' })).toBeTruthy();
  });

  it('un plan en attente de validation reste en LECTURE seule', async () => {
    const attente = { ...PLAN_MASSE, statut: 'en_attente_validation' };
    listerPlansRacines.mockResolvedValue({ items: [attente], total: 1 });
    getPlan.mockResolvedValue({ ...attente, reserves: [] });

    afficher();
    fireEvent.click(await screen.findByText('Plan de masse'));
    await waitFor(() => expect(canvas()).toBeTruthy());

    expect(canvas().getAttribute('data-mode')).toBe('lecture');
    expect(
      screen.getAllByText(/en attente de validation/i).length,
    ).toBeGreaterThan(0);
  });
});

// ── 3. Consulter une réserve déjà posée ─────────────────────────────────────

describe('repères des réserves', () => {
  it('un clic sur un repère ouvre la fiche de SA réserve', async () => {
    afficher();
    fireEvent.click(await screen.findByText('Plan de masse'));
    await waitFor(() => expect(canvas()).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'repere:r-1' }));

    expect(await screen.findByText('Fissure horizontale sous la fenêtre.')).toBeTruthy();
    expect(screen.getByText('Balla Beye')).toBeTruthy();
  });

  it('ne dessine que les repères de la PAGE affichée', async () => {
    getPlan.mockResolvedValue({
      ...DETAIL_MASSE,
      reserves: [
        ...DETAIL_MASSE.reserves,
        {
          id: 'r-2',
          numero: 'R-002',
          titre: 'Carrelage fendu',
          statut: 'creee',
          severite: 'moyenne',
          position: { x: 50, y: 50, zoom: 1, page: 3 },
          medias: [],
        },
      ],
    });

    afficher();
    fireEvent.click(await screen.findByText('Plan de masse'));
    await waitFor(() => expect(canvas()).toBeTruthy());

    // Page 1 : seul le repère de la page 1.
    expect(screen.getByRole('button', { name: 'repere:r-1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'repere:r-2' })).toBeNull();
  });
});

// ── 4. Point d'entrée direct ────────────────────────────────────────────────

describe('ouverture directe sur un plan', () => {
  it('`?planId=` ouvre l’explorateur SUR ce plan, sans repartir des plans globaux', async () => {
    afficher('?nom=R%C3%A9sidence%20Horizon&planId=p-masse');

    await waitFor(() => expect(canvas()).toBeTruthy());
    expect(getPlan).toHaveBeenCalledWith('p-masse');
    expect(listerPlansRacines).not.toHaveBeenCalled();
  });

  it('un identifiant devenu invalide retombe sur les plans globaux, pas sur une erreur', async () => {
    getPlan.mockRejectedValueOnce(new Error('introuvable'));

    afficher('?planId=disparu');

    expect(await screen.findByText('Plan de masse')).toBeTruthy();
    expect(listerPlansRacines).toHaveBeenCalledWith('c1');
  });
});
