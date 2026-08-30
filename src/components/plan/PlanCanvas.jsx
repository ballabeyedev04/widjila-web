import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Effet de bord volontaire : configure le worker pdf.js. Voir pdfWorker.js.
import { optionsDocument } from './pdfWorker.js';

import '../../assets/css/plan-canvas.css';

/**
 * Visionneuse de plan interactive — le socle du parcours décrit par le guide
 * client (« cliquez n'importe où sur le plan, la fenêtre Nouvelle réserve
 * s'ouvre »).
 *
 * POURQUOI UN CANVAS ET PAS UNE <iframe> : le plan était affiché dans une
 * iframe PDF. Une iframe est un document étranger — on ne connaît ni son zoom,
 * ni son décalage, ni la position de ses pages, et aucun clic n'en ressort.
 * Impossible d'y poser un repère au bon endroit, impossible d'y capter le
 * point cliqué. On rend donc la page NOUS-MÊMES avec pdf.js : le document
 * devient un simple élément de la page, dont on maîtrise la géométrie.
 *
 * POURQUOI LES MARQUEURS VIVENT DANS LE MÊME CONTENEUR TRANSFORMÉ : zoom et
 * déplacement sont appliqués une seule fois, sur `.pcanvas-doc`. Le canvas et
 * le calque des repères subissent donc EXACTEMENT la même transformation —
 * un repère ne peut pas se désolidariser du plan, quel que soit le geste.
 * Seule la taille visuelle des pastilles est compensée (`scale(1/zoom)`) pour
 * qu'elles restent lisibles au lieu de grossir avec le document.
 *
 * COORDONNÉES : tout ce qui entre et sort est en POURCENTAGES (0-100) de la
 * page rendue, jamais en pixels — c'est la convention de `ReservePosition` et
 * de `PlanHotspot` côté backend. Un pourcentage reste juste quel que soit
 * l'écran, le zoom ou la densité de pixels ; un pixel, non.
 */

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 8;

/** Contraint une valeur dans un intervalle. */
const borner = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Rend une page de PDF (ou une image) dans un canvas.
 *
 * La page est rasterisée à une résolution FIXE et généreuse (`echelleRendu`),
 * pas à la taille d'affichage : le zoom est ensuite purement CSS. Re-rasteriser
 * à chaque cran de zoom donnerait un texte plus net, mais relancerait un rendu
 * pdf.js à chaque molette — l'interface se figerait sous le geste.
 */
function usePageRendue({ blob, format, page, echelleRendu = 2 }) {
  const canvasRef = useRef(null);
  const [etat, setEtat] = useState({ chargement: true, erreur: null, nbPages: 1, ratio: 1.414 });

  useEffect(() => {
    if (!blob) return undefined;

    let annule = false;
    let tacheRendu = null;
    // La TÂCHE de chargement, et non le document : depuis pdf.js v6, c'est
    // elle qui porte `destroy()` — voir le nettoyage en fin d'effet.
    let tacheChargement = null;

    setEtat((e) => ({ ...e, chargement: true, erreur: null }));

    (async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // ── Image (plan photographié / exporté en PNG-JPG) ──────────────────
        if (format && format !== 'pdf') {
          const url = URL.createObjectURL(blob);
          try {
            const img = await new Promise((resolve, reject) => {
              const el = new Image();
              el.onload = () => resolve(el);
              el.onerror = () => reject(new Error('Image illisible'));
              el.src = url;
            });
            if (annule) return;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            setEtat({ chargement: false, erreur: null, nbPages: 1, ratio: img.naturalHeight / img.naturalWidth });
          } finally {
            URL.revokeObjectURL(url);
          }
          return;
        }

        // ── PDF ─────────────────────────────────────────────────────────────
        const donnees = new Uint8Array(await blob.arrayBuffer());
        if (annule) return;

        tacheChargement = pdfjsLib.getDocument(optionsDocument(donnees));
        const document_ = await tacheChargement.promise;
        if (annule) return;

        const numero = borner(page || 1, 1, document_.numPages);
        const pdfPage = await document_.getPage(numero);
        if (annule) return;

        const viewport = pdfPage.getViewport({ scale: echelleRendu });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // `canvas` et non `canvasContext` : ce dernier n'est conservé que par
        // compatibilité depuis pdf.js v6.
        tacheRendu = pdfPage.render({ canvas, viewport });
        await tacheRendu.promise;
        if (annule) return;

        setEtat({
          chargement: false,
          erreur: null,
          nbPages: document_.numPages,
          ratio: viewport.height / viewport.width,
        });
      } catch (err) {
        // `RenderingCancelledException` est le déroulement NORMAL quand
        // l'utilisateur change de page pendant un rendu : l'afficher comme une
        // erreur ferait clignoter un message d'échec à chaque navigation.
        if (annule || err?.name === 'RenderingCancelledException') return;
        setEtat((e) => ({ ...e, chargement: false, erreur: err?.message || 'Plan illisible' }));
      }
    })();

    return () => {
      annule = true;
      try { tacheRendu?.cancel(); } catch { /* rendu déjà terminé */ }
      // Libère le worker pdf.js : sans `destroy`, chaque ouverture de plan
      // laissait un document en mémoire jusqu'au rechargement de l'onglet.
      // `destroy()` vit sur la TÂCHE depuis la v6 — l'appeler sur le document
      // échouait silencieusement dans ce `catch`, et la fuite passait
      // inaperçue.
      try { tacheChargement?.destroy(); } catch { /* document jamais ouvert */ }
    };
  }, [blob, format, page, echelleRendu]);

  return { canvasRef, ...etat };
}

/**
 * @param {Blob}     blob         Fichier du plan (PDF ou image).
 * @param {string}   format       'pdf' | 'png' | 'jpg'…
 * @param {number}   page         Page affichée (1-indexée).
 * @param {Array}    marqueurs    [{ id, x, y, couleur, libelle, actif }] en %.
 * @param {Array}    hotspots     [{ id, x, y, largeur, hauteur, libelle }] en %.
 * @param {string}   mode         'lecture' | 'pointage' — en pointage, le
 *                                curseur devient une croix et chaque clic
 *                                remonte un point.
 * @param {Function} onPointClique(x, y)   Clic sur le plan, en %.
 * @param {Function} onMarqueurClique(m)
 * @param {Function} onHotspotClique(h)
 */
export default function PlanCanvas({
  blob,
  format = 'pdf',
  page = 1,
  marqueurs = [],
  hotspots = [],
  mode = 'lecture',
  onPointClique,
  onMarqueurClique,
  onHotspotClique,
  onPagesConnues,
  hauteur = 560,
}) {
  const { canvasRef, chargement, erreur, nbPages, ratio } = usePageRendue({ blob, format, page });

  const docRef = useRef(null);
  const [vue, setVue] = useState({ zoom: 1, x: 0, y: 0 });
  // `useRef` et non `useState` : le glissement s'écrit à chaque pixel de
  // souris, un re-rendu par pixel n'apporterait rien et saccaderait le geste.
  const glissement = useRef(null);

  // Remonte le nombre de pages dès qu'il est connu (barre de pagination).
  useEffect(() => {
    if (!chargement && !erreur) onPagesConnues?.(nbPages);
  }, [chargement, erreur, nbPages, onPagesConnues]);

  // Un changement de page ou de document repart d'une vue neuve : conserver
  // un zoom x6 et un décalage calculés pour la page précédente afficherait un
  // coin vide du nouveau document.
  useEffect(() => { setVue({ zoom: 1, x: 0, y: 0 }); }, [blob, page]);

  const zoomer = useCallback((facteur) => {
    setVue((v) => ({ ...v, zoom: borner(v.zoom * facteur, ZOOM_MIN, ZOOM_MAX) }));
  }, []);

  const reinitialiser = useCallback(() => setVue({ zoom: 1, x: 0, y: 0 }), []);

  /* ---------- Déplacement à la souris ---------- */
  const onMouseDown = (e) => {
    // Bouton gauche uniquement, et jamais depuis une pastille (sinon un clic
    // sur un repère serait avalé par le début d'un glissement).
    if (e.button !== 0 || e.target.closest('.pcanvas-pin')) return;
    glissement.current = { xDepart: e.clientX, yDepart: e.clientY, vue, bouge: false };
  };

  const onMouseMove = (e) => {
    const g = glissement.current;
    if (!g) return;
    const dx = e.clientX - g.xDepart;
    const dy = e.clientY - g.yDepart;
    // Seuil de 3 px : sans lui, le moindre frémissement de la main entre le
    // clic et le relâchement transformait un clic de pointage en glissement,
    // et la réserve ne se créait jamais.
    if (!g.bouge && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    g.bouge = true;
    setVue({ ...g.vue, x: g.vue.x + dx, y: g.vue.y + dy });
  };

  const finGlissement = () => {
    const bouge = glissement.current?.bouge;
    glissement.current = null;
    return bouge;
  };

  /* ---------- Molette = zoom centré sur le curseur ---------- */
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = docRef.current?.getBoundingClientRect();
    if (!rect) return;

    setVue((v) => {
      const facteur = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const zoom = borner(v.zoom * facteur, ZOOM_MIN, ZOOM_MAX);
      const reel = zoom / v.zoom; // facteur effectivement appliqué après bornage

      // Le point sous le curseur doit rester sous le curseur : on corrige le
      // décalage du delta introduit par l'agrandissement autour de ce point.
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      return { zoom, x: v.x - cx * (reel - 1), y: v.y - cy * (reel - 1) };
    });
  }, []);

  // `passive: false` est indispensable pour que `preventDefault()` soit
  // honoré : React attache `onWheel` en passif, et la page défilait sous le
  // plan à chaque tentative de zoom.
  const viewportRef = useRef(null);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  /* ---------- Clic sur le document ---------- */
  const onClickDoc = (e) => {
    if (finGlissement()) return;           // c'était un déplacement, pas un clic
    if (e.target.closest('.pcanvas-pin')) return; // géré par la pastille
    // Hors pointage, un clic sur le plan sert à descendre d'un niveau ou à
    // sélectionner un repère — jamais à poser un défaut. La garde vit ICI et
    // non chez l'appelant : la reproduire dans chaque parent en ferait une
    // règle qu'un oubli suffit à casser.
    if (mode !== 'pointage') return;

    const rect = docRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;

    // `getBoundingClientRect` d'un élément transformé renvoie sa boîte APRÈS
    // transformation : le rapport est donc directement le pourcentage cherché,
    // sans avoir à défaire zoom et translation à la main.
    const x = borner(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = borner(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
    onPointClique?.(Number(x.toFixed(2)), Number(y.toFixed(2)));
  };

  const styleDoc = useMemo(() => ({
    transform: `translate(${vue.x}px, ${vue.y}px) scale(${vue.zoom})`,
    aspectRatio: `1 / ${ratio || 1.414}`,
  }), [vue, ratio]);

  // Compense l'agrandissement du conteneur pour que les pastilles gardent
  // leur taille à l'écran quel que soit le zoom.
  const contreEchelle = { transform: `translate(-50%, -100%) scale(${1 / vue.zoom})` };

  return (
    <div className="pcanvas">
      <div
        ref={viewportRef}
        className={`pcanvas-viewport ${mode === 'pointage' ? 'pointage' : ''}`}
        style={{ height: hauteur }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={finGlissement}
        onMouseLeave={() => { glissement.current = null; }}
      >
        <div ref={docRef} className="pcanvas-doc" style={styleDoc} onClick={onClickDoc}>
          <canvas ref={canvasRef} className="pcanvas-canvas" />

          {/* Zones cliquables — descendent d'un niveau dans la structure. */}
          {hotspots.map((h) => {
            const aUneSurface = (h.largeur || 0) > 0 && (h.hauteur || 0) > 0;
            return (
              <button
                key={h.id}
                type="button"
                className={`pcanvas-hotspot ${aUneSurface ? 'zone' : 'point'}`}
                style={aUneSurface
                  ? { left: `${h.x}%`, top: `${h.y}%`, width: `${h.largeur}%`, height: `${h.hauteur}%` }
                  : { left: `${h.x}%`, top: `${h.y}%`, ...contreEchelle }}
                onClick={(e) => { e.stopPropagation(); onHotspotClique?.(h); }}
                title={h.libelle || ''}
              >
                <span className="pcanvas-hotspot-label">{h.libelle}</span>
              </button>
            );
          })}

          {/* Repères de réserves. */}
          {marqueurs.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`pcanvas-pin ${m.actif ? 'actif' : ''}`}
              style={{ left: `${m.x}%`, top: `${m.y}%`, ...contreEchelle, '--pin-couleur': m.couleur || 'var(--primary)' }}
              onClick={(e) => { e.stopPropagation(); onMarqueurClique?.(m); }}
              title={m.libelle || ''}
            >
              <span className="pcanvas-pin-point" />
            </button>
          ))}
        </div>

        {chargement && <div className="pcanvas-etat">Chargement du plan…</div>}
        {erreur && <div className="pcanvas-etat erreur">{erreur}</div>}
      </div>

      <div className="pcanvas-outils">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => zoomer(1 / 1.3)} aria-label="Dézoomer">−</button>
        <span className="pcanvas-zoom">{Math.round(vue.zoom * 100)} %</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => zoomer(1.3)} aria-label="Zoomer">+</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reinitialiser}>Ajuster</button>
      </div>
    </div>
  );
}
