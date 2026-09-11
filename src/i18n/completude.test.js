import { describe, it, expect } from 'vitest';

import { SUPPORTED_LANGUAGES, FALLBACK_LANGUAGE } from './index.js';

/**
 * Chaque libellé existe-t-il dans les quatre langues ?
 *
 * ## Pourquoi ce test doit exister
 *
 * Une clé absente ne provoque AUCUNE erreur : i18next affiche la clé brute
 * (`chantier.explorateur.titre`) à la place du libellé. Le défaut est donc
 * invisible pendant tout le développement — on travaille en français, où la
 * clé existe — et n'apparaît que chez un client allemand ou espagnol, sur un
 * écran que personne de l'équipe n'ouvre dans cette langue.
 *
 * Depuis que les traductions vivent dans un fichier par langue, ajouter une clé
 * demande de la poser dans quatre fichiers. En oublier un est le geste le plus
 * naturel du monde ; ce test est ce qui le rattrape.
 *
 * ## Ce qu'il compare
 *
 * Le français fait référence — c'est la langue de rédaction et la langue de
 * repli. Toute clé qu'il porte doit exister ailleurs. L'inverse est aussi
 * vérifié : une clé présente UNIQUEMENT en allemand est du texte mort, ou le
 * signe qu'une clé française a été renommée sans suivre.
 */

/** Les modules de traduction, groupés par langue puis par namespace. */
const modules = import.meta.glob('./locales/*/*.js', { eager: true });

/** `./locales/de/chantier.js` → `['de', 'chantier']`. */
const decomposer = (chemin) => {
  const morceaux = chemin.split('/');
  return [morceaux.at(-2), morceaux.at(-1).replace(/\.js$/, '')];
};

/** Chemins de toutes les feuilles d'un dictionnaire. */
function cheminsDesCles(objet, prefixe = '', sortie = []) {
  for (const [cle, valeur] of Object.entries(objet ?? {})) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
      cheminsDesCles(valeur, chemin, sortie);
    } else {
      sortie.push(chemin);
    }
  }
  return sortie;
}

/** `{ langue: { namespace: Set<chemin de clé> } }` */
const cles = {};
for (const [chemin, mod] of Object.entries(modules)) {
  const [langue, namespace] = decomposer(chemin);
  cles[langue] ??= {};
  cles[langue][namespace] = new Set(cheminsDesCles(mod.default || {}));
}

const NAMESPACES = Object.keys(cles[FALLBACK_LANGUAGE] ?? {});
const AUTRES_LANGUES = SUPPORTED_LANGUAGES.filter((l) => l !== FALLBACK_LANGUAGE);

// ── La structure elle-même ──────────────────────────────────────────────────

describe('structure des fichiers', () => {
  it('les quatre langues sont présentes', () => {
    expect(Object.keys(cles).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('chaque langue porte TOUS les namespaces', () => {
    for (const langue of AUTRES_LANGUES) {
      const manquants = NAMESPACES.filter((ns) => !cles[langue]?.[ns]);
      // Un namespace absent laisserait un écran entier en français au milieu
      // d'une interface traduite — sans erreur, sans rien signaler.
      expect({ langue, manquants }).toEqual({ langue, manquants: [] });
    }
  });

  it('il y a bien quelque chose à vérifier', () => {
    expect(NAMESPACES.length).toBeGreaterThan(5);
  });
});

// ── Aucune clé ne manque ────────────────────────────────────────────────────

describe('complétude des traductions', () => {
  it.each(AUTRES_LANGUES)('« %s » traduit tout ce que porte le français', (langue) => {
    const manquantes = [];
    for (const ns of NAMESPACES) {
      const reference = cles[FALLBACK_LANGUAGE][ns];
      const traduites = cles[langue]?.[ns] ?? new Set();
      for (const cle of reference) {
        if (!traduites.has(cle)) manquantes.push(`${ns}:${cle}`);
      }
    }
    expect(manquantes).toEqual([]);
  });

  it.each(AUTRES_LANGUES)('« %s » ne porte aucune clé absente du français', (langue) => {
    const orphelines = [];
    for (const ns of NAMESPACES) {
      const reference = cles[FALLBACK_LANGUAGE][ns];
      for (const cle of cles[langue]?.[ns] ?? []) {
        if (!reference.has(cle)) orphelines.push(`${ns}:${cle}`);
      }
    }
    // Du texte mort, ou une clé française renommée sans que celle-ci suive.
    expect(orphelines).toEqual([]);
  });
});

// ── Aucun libellé vide ──────────────────────────────────────────────────────

describe('valeurs', () => {
  it.each(SUPPORTED_LANGUAGES)('« %s » n’a aucun libellé vide', (langue) => {
    const vides = [];
    for (const [ns, mod] of Object.entries(modules)
      .filter(([chemin]) => decomposer(chemin)[0] === langue)
      .map(([chemin, m]) => [decomposer(chemin)[1], m])) {
      const parcourir = (objet, prefixe = '') => {
        for (const [cle, valeur] of Object.entries(objet ?? {})) {
          const chemin = prefixe ? `${prefixe}.${cle}` : cle;
          if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
            parcourir(valeur, chemin);
          } else if (typeof valeur === 'string' && !valeur.trim()) {
            // Une chaîne vide affiche un blanc là où un mot est attendu — plus
            // difficile à repérer qu'une clé brute, et tout aussi cassé.
            vides.push(`${ns}:${chemin}`);
          }
        }
      };
      parcourir(mod.default || {});
    }
    expect(vides).toEqual([]);
  });
});
