import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

// pdf.js est mocké : le test porte sur la GÉOMÉTRIE du composant (conversion
// d'un clic en pourcentages, ancrage des repères), pas sur la capacité de
// pdf.js à rasteriser un document — et charger le vrai worker dans jsdom
// n'apporterait qu'une source de lenteur et d'échecs intermittents.
// Le module de configuration du worker est neutralisé : il fait résoudre par
// le bundler un fichier de 1,2 Mo, ce qui faisait expirer le démarrage du
// worker de test avant même le premier `it`.
vi.mock('./pdfWorker.js', () => ({
  default: { workerSrc: '' },
  // Les composants passent par cette fabrique : le stub doit la fournir.
  optionsDocument: (donnees) => ({ data: donnees }),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 3,
      destroy: () => {},
      getPage: () =>
        Promise.resolve({
          getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
          render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
        }),
    }),
  }),
}));

import PlanCanvas from './PlanCanvas.jsx';

// `globals: false` dans vitest.config.js → le nettoyage de
// @testing-library/react ne s'installe pas tout seul.
afterEach(cleanup);

/**
 * jsdom ne fait aucune mise en page : toute boîte mesure 0×0, et la conversion
 * en pourcentages diviserait par zéro. On impose donc au conteneur du document
 * une boîte connue — 400 px de large sur 200 px de haut, à 50 px du bord
 * gauche et 100 px du haut — pour pouvoir prédire exactement le résultat.
 */
const RECT = { left: 50, top: 100, width: 400, height: 200, right: 450, bottom: 300, x: 50, y: 100 };

function figerGeometrie() {
  Element.prototype.getBoundingClientRect = function getRect() {
    return this.classList?.contains('pcanvas-doc')
      ? { ...RECT, toJSON: () => RECT }
      : { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) };
  };
}

let rectOriginal;
beforeEach(() => {
  rectOriginal = Element.prototype.getBoundingClientRect;
  figerGeometrie();
  // Le canvas n'est pas implémenté par jsdom ; seul `drawImage` est appelé
  // par le chemin « image », jamais par le chemin PDF testé ici.
  HTMLCanvasElement.prototype.getContext = () => ({ drawImage: () => {} });
});
afterEach(() => {
  Element.prototype.getBoundingClientRect = rectOriginal;
});

const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

/** Attend la fin du rendu de la page (le bandeau « Chargement » disparaît). */
const attendreRendu = () => waitFor(() => expect(screen.queryByText(/Chargement/i)).toBeNull());

describe('PlanCanvas — conversion du clic en coordonnées', () => {
  it('convertit un clic en pourcentages de la page, pas en pixels', async () => {
    const onPointClique = vi.fn();
    const { container } = render(
      <PlanCanvas blob={blob} mode="pointage" onPointClique={onPointClique} />
    );
    await attendreRendu();

    // Un clic au quart de la largeur et à la moitié de la hauteur.
    fireEvent.click(container.querySelector('.pcanvas-doc'), {
      clientX: RECT.left + 100, // 100 / 400 = 25 %
      clientY: RECT.top + 100, // 100 / 200 = 50 %
    });

    expect(onPointClique).toHaveBeenCalledWith(25, 50);
  });

  it('borne un clic hors de la page à l’intervalle 0-100', async () => {
    // Un pourcentage négatif ou supérieur à 100 serait refusé par le schéma
    // Joi du serveur et poserait un repère invisible : on préfère le ramener
    // au bord plutôt que perdre le geste.
    const onPointClique = vi.fn();
    const { container } = render(
      <PlanCanvas blob={blob} mode="pointage" onPointClique={onPointClique} />
    );
    await attendreRendu();

    fireEvent.click(container.querySelector('.pcanvas-doc'), {
      clientX: RECT.left - 500,
      clientY: RECT.top + 5000,
    });

    expect(onPointClique).toHaveBeenCalledWith(0, 100);
  });

  it('n’émet aucun point hors du mode pointage', async () => {
    // En lecture, un clic sur le plan sert à descendre d'un niveau ou à
    // sélectionner un repère — jamais à poser une réserve.
    const onPointClique = vi.fn();
    const { container } = render(
      <PlanCanvas blob={blob} mode="lecture" onPointClique={onPointClique} />
    );
    await attendreRendu();

    fireEvent.click(container.querySelector('.pcanvas-doc'), {
      clientX: RECT.left + 100,
      clientY: RECT.top + 100,
    });

    expect(onPointClique).not.toHaveBeenCalled();
  });

  it('ne déclenche pas de clic après un déplacement du plan', async () => {
    // Sans seuil de glissement, déplacer le plan se terminait par un clic et
    // ouvrait le formulaire de réserve à l'endroit où l'utilisateur avait
    // relâché — au lieu de simplement recadrer la vue.
    const onPointClique = vi.fn();
    const { container } = render(
      <PlanCanvas blob={blob} mode="pointage" onPointClique={onPointClique} />
    );
    await attendreRendu();

    const viewport = container.querySelector('.pcanvas-viewport');
    const doc = container.querySelector('.pcanvas-doc');

    fireEvent.mouseDown(viewport, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.mouseMove(viewport, { clientX: 260, clientY: 240 }); // > seuil de 3 px
    fireEvent.click(doc, { clientX: RECT.left + 100, clientY: RECT.top + 100 });

    expect(onPointClique).not.toHaveBeenCalled();
  });

  it('conserve le clic quand la main a seulement frémi', async () => {
    // Le seuil existe précisément pour que 2 px de tremblement entre l'appui
    // et le relâchement restent un clic.
    const onPointClique = vi.fn();
    const { container } = render(
      <PlanCanvas blob={blob} mode="pointage" onPointClique={onPointClique} />
    );
    await attendreRendu();

    const viewport = container.querySelector('.pcanvas-viewport');
    const doc = container.querySelector('.pcanvas-doc');

    fireEvent.mouseDown(viewport, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.mouseMove(viewport, { clientX: 202, clientY: 201 }); // sous le seuil
    fireEvent.click(doc, { clientX: RECT.left + 200, clientY: RECT.top + 50 });

    expect(onPointClique).toHaveBeenCalledWith(50, 25);
  });
});

describe('PlanCanvas — repères et zones cliquables', () => {
  it('positionne chaque repère au pourcentage enregistré', async () => {
    const { container } = render(
      <PlanCanvas
        blob={blob}
        marqueurs={[{ id: 'r1', x: 33.5, y: 66.25, libelle: 'R-0001' }]}
      />
    );
    await attendreRendu();

    const pin = container.querySelector('.pcanvas-pin');
    expect(pin.style.left).toBe('33.5%');
    expect(pin.style.top).toBe('66.25%');
  });

  it('remonte le repère cliqué sans poser de point sur le plan', async () => {
    // Un clic sur une pastille sélectionne la réserve ; il ne doit pas être
    // interprété comme la désignation d'un nouveau défaut au même endroit.
    const onMarqueurClique = vi.fn();
    const onPointClique = vi.fn();
    const { container } = render(
      <PlanCanvas
        blob={blob}
        mode="pointage"
        marqueurs={[{ id: 'r1', x: 20, y: 20 }]}
        onMarqueurClique={onMarqueurClique}
        onPointClique={onPointClique}
      />
    );
    await attendreRendu();

    fireEvent.click(container.querySelector('.pcanvas-pin'));

    expect(onMarqueurClique).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
    expect(onPointClique).not.toHaveBeenCalled();
  });

  it('dessine un hotspot sans surface comme un simple point', async () => {
    const { container } = render(
      <PlanCanvas blob={blob} hotspots={[{ id: 'h1', x: 10, y: 20, largeur: 0, hauteur: 0, libelle: 'BÂTIMENT A' }]} />
    );
    await attendreRendu();

    const hotspot = container.querySelector('.pcanvas-hotspot');
    expect(hotspot.classList.contains('point')).toBe(true);
    expect(hotspot.textContent).toContain('BÂTIMENT A');
  });

  it('dessine un hotspot avec surface comme une zone dimensionnée', async () => {
    const { container } = render(
      <PlanCanvas blob={blob} hotspots={[{ id: 'h1', x: 10, y: 20, largeur: 30, hauteur: 15 }]} />
    );
    await attendreRendu();

    const hotspot = container.querySelector('.pcanvas-hotspot');
    expect(hotspot.classList.contains('zone')).toBe(true);
    expect(hotspot.style.width).toBe('30%');
    expect(hotspot.style.height).toBe('15%');
  });

  it('remonte le nombre de pages du document', async () => {
    const onPagesConnues = vi.fn();
    render(<PlanCanvas blob={blob} onPagesConnues={onPagesConnues} />);
    await waitFor(() => expect(onPagesConnues).toHaveBeenCalledWith(3));
  });
});
