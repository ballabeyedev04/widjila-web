import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import Swal from 'sweetalert2';

import SwalCustom from './swal.config.js';

/**
 * XSS stockée par les boîtes de dialogue — avec la VRAIE SweetAlert2.
 *
 * ## Le défaut
 *
 * Pour SweetAlert2, `title` est du HTML : la bibliothèque le parse et insère
 * les nœuds obtenus dans la page (`parseHtmlToContainer`). Seul `titleText`
 * est du texte. De plus, i18next est configuré avec `escapeValue: false`
 * (React échappe déjà ce qu'il affiche) : un nom interpolé dans une clé de
 * traduction arrive donc TEL QUEL dans le titre.
 *
 * Or les confirmations de suppression reprennent justement des noms saisis
 * par d'autres : « Supprimer {{nom}} ? » pour un utilisateur, une
 * organisation, un chantier, un plan… L'inscription publique suffit à en
 * choisir un. Un compte s'inscrit sous le nom `<img src=x onerror=…>`, le
 * super-admin clique « Supprimer » ou « Suspendre » sur sa ligne, et le
 * script s'exécute dans SA session — celle qui voit toutes les organisations.
 *
 * La CSP de production (`script-src` sans 'unsafe-inline') bloque les
 * attributs `on*`. Elle ne bloque ni l'injection de balises (faux formulaire,
 * lien piégé, image-balise vers un tiers), ni rien du tout là où elle n'est
 * pas posée. La correction doit donc tenir sans elle.
 *
 * ## Ce que ces tests vérifient
 *
 * Le rendu RÉEL dans le DOM : aucun élément injecté, le texte transmis tel
 * quel. Seule l'option `html`, explicite et documentée, reste interprétée.
 *
 * Le texte du titre est lu par `innerText`, et non `textContent` : c'est la
 * propriété qu'écrit SweetAlert2 pour `titleText`, et jsdom — qui ne calcule
 * aucun rendu — la conserve sans la refléter dans `textContent`.
 */

vi.mock('../i18n/index.js', () => ({
  default: { t: (cle) => `[${cle}]` },
}));

const CHARGE = '<img src="x" id="piege" onerror="window.__xss = true">';

// Pas de `Swal.close()` entre les tests : sous jsdom (aucune animation), une
// fermeture laisse l'instance courante sans sa fonction de résolution, et le
// `fire` suivant lève « swalPromiseResolve is not a function ». Chaque test
// ouvre simplement une nouvelle boîte, qui REMPLACE la précédente — titre et
// corps compris — comme dans l'application.
afterEach(() => {
  delete window.__xss;
});

// jsdom n'implémente pas `matchMedia`, que SweetAlert2 consulte à l'ouverture
// (préférence de mouvement réduit). Sans cette doublure, la première boîte
// lève en cours d'initialisation et laisse la bibliothèque dans un état
// incohérent pour toutes les suivantes.
beforeAll(() => {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (media) => ({
      matches: false, media, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false,
    });
  }
});

const titre = () => document.querySelector('.swal2-title');

describe('reproduction — SweetAlert2 seule', () => {
  it('interprète `title` comme du HTML : la balise est insérée dans la page', () => {
    // Le comportement de la bibliothèque, qui justifie la correction : ce
    // test documente la cause et échouerait si SweetAlert2 changeait d'avis.
    Swal.fire({ title: CHARGE });

    expect(document.getElementById('piege')).not.toBeNull();
  });
});

describe('SwalCustom — un nom piégé reste du texte', () => {
  it('dans une confirmation de suppression', () => {
    SwalCustom.confirm({ title: `Supprimer ${CHARGE} ?`, danger: true });

    expect(document.getElementById('piege')).toBeNull();
    expect(titre().innerText).toBe(`Supprimer ${CHARGE} ?`);
  });

  it.each(['success', 'info', 'warning'])('dans une notification « %s » passée en chaîne', (type) => {
    // Forme courte : la chaîne devient le TITRE.
    SwalCustom[type](`Compte ${CHARGE} créé`);

    expect(document.getElementById('piege')).toBeNull();
  });

  it('dans une notification passée en objet', () => {
    SwalCustom.error({ title: CHARGE, text: CHARGE });

    expect(document.getElementById('piege')).toBeNull();
  });

  it('dans un appel direct à `fire` (écran « Membres »)', () => {
    SwalCustom.fire({ icon: 'warning', title: CHARGE, text: 'x' });

    expect(document.getElementById('piege')).toBeNull();
    expect(titre().innerText).toBe(CHARGE);
  });

  it('dans la forme positionnelle `fire(titre, corps)` — le corps n’est plus du HTML', () => {
    SwalCustom.fire(CHARGE, CHARGE);

    expect(document.getElementById('piege')).toBeNull();
  });
});

describe('ce qui reste permis', () => {
  it('l’option `html`, explicite, garde sa mise en forme', () => {
    // Opt-in documenté : l'appelant échappe lui-même ce qu'il interpole
    // (voir Login.jsx, avertissement de fin d'essai).
    SwalCustom.confirm({ title: 'Essai', html: '<strong id="gras">2 jours</strong>' });

    expect(document.getElementById('gras')).not.toBeNull();
  });

  it('un titre ordinaire s’affiche normalement', () => {
    SwalCustom.confirm({ title: 'Supprimer Awa Diop ?' });

    expect(titre().innerText).toBe('Supprimer Awa Diop ?');
  });
});
