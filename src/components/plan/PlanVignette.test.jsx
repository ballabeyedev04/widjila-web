import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';

// Même neutralisation que PlanCanvas.test.jsx : le module de configuration du
// worker fait résoudre par le bundler un fichier de 1,2 Mo, ce qui faisait
// expirer le démarrage du worker de test.
vi.mock('./pdfWorker.js', () => ({
  default: { workerSrc: '' },
  // Les composants passent par cette fabrique : le stub doit la fournir.
  optionsDocument: (donnees) => ({ data: donnees }),
}));

const detruire = vi.fn();
const rendrePage = vi.fn(() => ({ promise: Promise.resolve() }));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  // `getDocument()` rend une TÂCHE de chargement, et c'est elle qui porte
  // `destroy()` — pas le document. Le simulacre plaçait `destroy` sur le
  // document : le composant appelait donc `tache.destroy()`, inexistant dans
  // le simulacre, et le test validait une libération qui n'était pas celle
  // que le code effectue réellement.
  getDocument: () => ({
    destroy: detruire,
    promise: Promise.resolve({
      numPages: 1,
      getPage: () => Promise.resolve({
        getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
        render: rendrePage,
      }),
    }),
  }),
}));

const fetchFichierBlob = vi.fn();
vi.mock('../../service/plan/planService.js', () => ({
  fetchFichierBlob: (...args) => fetchFichierBlob(...args),
}));

import PlanVignette from './PlanVignette.jsx';

// `globals: false` dans vitest.config.js → le nettoyage ne s'installe pas seul.
afterEach(cleanup);

/**
 * `IntersectionObserver` n'existe pas dans jsdom. On le remplace par une
 * implémentation qui déclenche IMMÉDIATEMENT l'entrée dans le champ de vision :
 * le rendu différé est une optimisation de production, le tester ici
 * n'apporterait qu'un délai artificiel.
 */
class ObservateurImmediat {
  constructor(rappel) { this.rappel = rappel; }

  observe() { this.rappel([{ isIntersecting: true }]); }

  disconnect() {}
}

/** Compteur incrémenté pour que chaque test travaille sur un fichier distinct. */
let compteur = 0;
const planNeuf = (surcharge = {}) => {
  compteur += 1;
  return { id: `p${compteur}`, nom: `Plan ${compteur}`, format: 'pdf', fichier_url: `/uploads/plans/p${compteur}.pdf`, ...surcharge };
};

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.IntersectionObserver = ObservateurImmediat;

  // jsdom n'implémente ni le contexte 2D ni l'export d'un canvas.
  HTMLCanvasElement.prototype.getContext = () => ({
    drawImage: () => {}, fillRect: () => {}, fillStyle: '',
  });
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,ABC';

  fetchFichierBlob.mockResolvedValue({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
});

describe('PlanVignette — repli', () => {
  it('affiche l’icône tant que l’aperçu n’est pas prêt', () => {
    // Une carte ne doit jamais rester vide pendant le téléchargement : c'est
    // ce que l'utilisateur voit d'abord, et le plus souvent tout ce qu'il
    // verra sur un format non rasterisable.
    fetchFichierBlob.mockImplementation(() => new Promise(() => {})); // jamais résolu
    const { container } = render(<PlanVignette plan={planNeuf()} />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('reste sur l’icône quand le fichier est illisible', async () => {
    // Réseau coupé, fichier absent, PDF corrompu : l'aperçu est un confort,
    // son absence ne doit jamais masquer la carte.
    fetchFichierBlob.mockRejectedValue(new Error('404'));
    const { container } = render(<PlanVignette plan={planNeuf()} />);

    await waitFor(() => expect(fetchFichierBlob).toHaveBeenCalled());
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('PlanVignette — rendu', () => {
  it('remplace l’icône par la première page une fois rendue', async () => {
    const { container } = render(<PlanVignette plan={planNeuf()} />);

    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    expect(container.querySelector('img').getAttribute('src')).toBe('data:image/jpeg;base64,ABC');
  });

  it('libère le document pdf.js après le rendu', async () => {
    // Sans `destroy`, chaque vignette laissait un document en mémoire jusqu'au
    // rechargement de l'onglet — une liste de trente plans en retenait trente.
    const { container, unmount } = render(<PlanVignette plan={planNeuf()} />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    unmount();
    expect(detruire).toHaveBeenCalled();
  });

  it('applique la classe demandée, pour servir dans plusieurs mises en page', () => {
    const { container } = render(
      <PlanVignette plan={planNeuf()} className="plan-thumb-apercu" />
    );
    expect(container.querySelector('.plan-thumb-apercu')).not.toBeNull();
  });
});

describe('PlanVignette — cache de session', () => {
  it('ne retélécharge pas un plan déjà rendu', async () => {
    // C'est ce qui rend l'aperçu tenable : revenir sur l'onglet « Plans » ou
    // basculer entre les deux vues ne doit rien redemander au réseau.
    const plan = planNeuf();

    const premier = render(<PlanVignette plan={plan} />);
    await waitFor(() => expect(premier.container.querySelector('img')).not.toBeNull());
    expect(fetchFichierBlob).toHaveBeenCalledTimes(1);

    cleanup();

    const second = render(<PlanVignette plan={plan} />);
    // L'aperçu est là DÈS le premier rendu : pas de clignotement d'icône.
    expect(second.container.querySelector('img')).not.toBeNull();
    expect(fetchFichierBlob).toHaveBeenCalledTimes(1);
  });

  it('n’affiche pas l’aperçu d’un plan pour un autre', async () => {
    // Le recyclage d'une carte (filtre, pagination) doit repartir du cache du
    // NOUVEAU fichier, sinon la liste montre le mauvais plan.
    const planA = planNeuf();
    const planB = planNeuf();

    const { container, rerender } = render(<PlanVignette plan={planA} />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    fetchFichierBlob.mockImplementation(() => new Promise(() => {})); // B ne répond pas
    rerender(<PlanVignette plan={planB} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('PlanVignette — formats non PDF', () => {
  it('dessine une image sans passer par pdf.js', async () => {
    // Un plan exporté en PNG est déjà son propre aperçu : le faire transiter
    // par pdf.js échouerait.
    const Originale = globalThis.Image;
    globalThis.Image = class {
      set src(_) { queueMicrotask(() => this.onload && this.onload()); }

      get naturalWidth() { return 800; }

      get naturalHeight() { return 600; }
    };
    globalThis.URL.createObjectURL = () => 'blob:test';
    globalThis.URL.revokeObjectURL = () => {};

    try {
      const { container } = render(<PlanVignette plan={planNeuf({ format: 'png' })} />);
      await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
      expect(detruire).not.toHaveBeenCalled();
    } finally {
      globalThis.Image = Originale;
    }
  });
});
