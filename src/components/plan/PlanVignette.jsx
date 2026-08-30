import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Même worker que PlanCanvas — voir pdfWorker.js.
import { optionsDocument } from './pdfWorker.js';

import { fetchFichierBlob } from '../../service/plan/planService.js';

/**
 * Aperçu d'un plan — la PREMIÈRE PAGE du document, et non une icône générique.
 *
 * Une carte de plan qui n'affiche qu'un pictogramme PDF oblige à ouvrir chaque
 * document pour savoir lequel on regarde. Sur un chantier qui compte trente
 * plans d'appartements presque homonymes (« A201 », « A202 »…), c'est la
 * différence entre reconnaître un plan d'un coup d'œil et les ouvrir un par un.
 *
 * ── Trois précautions, dans cet ordre d'importance ─────────────────────────
 *
 * 1. RENDU DIFFÉRÉ (`IntersectionObserver`). Le fichier n'est téléchargé que
 *    lorsque la carte entre dans le champ de vision. Sans cela, ouvrir une
 *    liste de trente plans déclencherait trente téléchargements simultanés —
 *    plusieurs dizaines de mégaoctets sur une connexion de chantier.
 *
 * 2. CACHE DE SESSION. Le rendu est conservé en mémoire, indexé par fichier :
 *    revenir sur l'onglet « Plans », basculer entre « Parcourir » et « Tous
 *    les plans » ou rouvrir un chantier réutilise l'image déjà produite au
 *    lieu de retélécharger le PDF.
 *
 * 3. REPLI SILENCIEUX. Fichier illisible, format DWG/IFC sans visionneuse,
 *    réseau coupé : l'icône reste affichée. Un aperçu est un confort, son
 *    absence ne doit jamais masquer la carte ni bloquer la navigation.
 */

/**
 * Aperçus déjà produits, indexés par chemin de fichier.
 *
 * On stocke une image encodée (`dataURL`) plutôt que le PDF : quelques dizaines
 * de kilo-octets au lieu de plusieurs mégaoctets, et surtout aucun rendu
 * pdf.js à refaire. Le plafond évite qu'une longue session de navigation ne
 * finisse par retenir tous les plans de l'organisation.
 */
const CACHE = new Map();
const CACHE_MAX = 60;

function memoriser(cle, dataUrl) {
  if (!cle) return;
  // Éviction simple de la plus ancienne entrée : une vignette perdue se
  // reconstruit toute seule au prochain affichage, une politique LRU complète
  // n'apporterait rien ici.
  if (CACHE.size >= CACHE_MAX) {
    const premiere = CACHE.keys().next().value;
    CACHE.delete(premiere);
  }
  CACHE.set(cle, dataUrl);
}

/**
 * @param {object}   plan        Le plan à prévisualiser (`fichier_url`, `format`).
 * @param {string}   className   Classe du conteneur — permet d'utiliser le
 *                               même composant dans les grilles de navigation
 *                               et dans les cartes de la liste.
 * @param {Function} Icone       Icône de repli, tant que l'aperçu n'est pas prêt.
 * @param {number}   tailleIcone Taille de cette icône.
 */
export default function PlanVignette({
  plan,
  className = 'pnav-tuile-apercu',
  Icone,
  tailleIcone = 26,
}) {
  // Repli résolu dans le corps plutôt que par une valeur par défaut de
  // destructuring : `no-unused-vars` ne compte pas l'usage JSX (limite connue
  // d'ESLint 9, voir eslint.config.js) et son `varsIgnorePattern` capitalisé
  // ne couvre pas les paramètres destructurés.
  const IconeRepli = Icone || FileText;
  const conteneurRef = useRef(null);
  const cle = plan?.fichier_url || null;

  const [visible, setVisible] = useState(false);
  // Le cache est consulté DÈS le premier rendu : une vignette déjà connue
  // s'affiche sans le moindre clignotement d'icône.
  const [apercu, setApercu] = useState(() => (cle ? CACHE.get(cle) || null : null));

  // Un changement de plan (liste filtrée, pagination) doit repartir de l'état
  // du cache pour CE fichier, pas conserver l'aperçu du précédent.
  useEffect(() => {
    setApercu(cle ? CACHE.get(cle) || null : null);
  }, [cle]);

  useEffect(() => {
    const el = conteneurRef.current;
    if (!el || visible || apercu) return undefined;

    const observateur = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) {
        setVisible(true);
        observateur.disconnect();
      }
    }, { rootMargin: '200px' });

    observateur.observe(el);
    return () => observateur.disconnect();
  }, [visible, apercu]);

  useEffect(() => {
    if (!visible || !cle || apercu) return undefined;

    let annule = false;
    // La TÂCHE de chargement, et non le document : depuis pdf.js v6, c'est
    // elle qui porte `destroy()` — voir le nettoyage en fin d'effet.
    let tacheChargement = null;

    (async () => {
      try {
        const blob = await fetchFichierBlob(cle);
        if (annule) return;

        // Le rendu se fait sur un canvas HORS du DOM : le composant n'affiche
        // qu'une <img>. Sans cela, un canvas monté puis démonté pendant un
        // défilement rapide laissait des rendus pdf.js orphelins en cours.
        const canvas = document.createElement('canvas');

        // ── Image (plan photographié ou exporté en PNG/JPG) ───────────────
        if (plan.format && plan.format !== 'pdf') {
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
          } finally {
            URL.revokeObjectURL(url);
          }
        } else {
          // ── PDF ───────────────────────────────────────────────────────
          tacheChargement = pdfjsLib.getDocument(
            optionsDocument(new Uint8Array(await blob.arrayBuffer()))
          );
          const document_ = await tacheChargement.promise;
          if (annule) return;
          const page = await document_.getPage(1);
          if (annule) return;

          // Largeur cible fixe plutôt qu'une échelle fixe : un plan A0 et un
          // plan A4 donnaient sinon des vignettes de poids très différents,
          // la première pesant plusieurs mégaoctets pour être ensuite réduite
          // à 200 px par le navigateur.
          const base = page.getViewport({ scale: 1 });
          const echelle = Math.min(1.5, 420 / base.width);
          const viewport = page.getViewport({ scale: echelle });

          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          // Fond blanc : un PDF sans calque de fond se rendrait en traits
          // noirs sur du transparent, illisible sur la carte claire.
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // `canvas` et non `canvasContext` : ce dernier n'est conservé que
          // par compatibilité depuis pdf.js v6. Le fond blanc posé
          // ci-dessus reste en place, le rendu se compose par-dessus.
          await page.render({ canvas, viewport }).promise;
          if (annule) return;
        }

        // JPEG plutôt que PNG : un plan est essentiellement du trait sur du
        // blanc, la qualité 0,82 est indiscernable à cette taille et divise le
        // poids en cache par cinq.
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        memoriser(cle, dataUrl);
        if (!annule) setApercu(dataUrl);
      } catch {
        /* Aperçu indisponible — l'icône de repli reste affichée. */
      }
    })();

    return () => {
      annule = true;
      // Libère le worker pdf.js : sans `destroy`, chaque vignette laissait un
      // document en mémoire jusqu'au rechargement de l'onglet.
      // `destroy()` vit sur la TÂCHE depuis la v6 — l'appeler sur le document
      // échouait silencieusement dans ce `catch`, et la fuite passait
      // inaperçue.
      try { tacheChargement?.destroy(); } catch { /* document jamais ouvert */ }
    };
  }, [visible, cle, apercu, plan?.format]);

  return (
    <div ref={conteneurRef} className={className}>
      {apercu
        ? <img src={apercu} alt="" loading="lazy" />
        : <IconeRepli size={tailleIcone} />}
    </div>
  );
}
