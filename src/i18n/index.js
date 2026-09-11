import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Internationalisation (module 1 — « Gestion des langues »).
 *
 * Langues supportées : français, anglais, allemand, espagnol.
 *
 * Chargement des traductions
 * --------------------------
 * Un fichier par LANGUE et par namespace : `./locales/<langue>/<namespace>.js`,
 * qui exporte directement le dictionnaire de cette langue.
 *
 *     // locales/fr/chantier.js
 *     export default { titre: 'Chantiers' };
 *
 * Les fichiers sont découverts automatiquement (import.meta.glob de Vite) :
 * ajouter un namespace ne demande aucune modification ici. Le nom du fichier
 * devient le nom du namespace (`fr/chantier.js` → `t('chantier:titre')`).
 *
 * ── Pourquoi une langue par fichier ───────────────────────────────────────
 *
 * Les quatre langues vivaient dans le même module. `import.meta.glob` avec
 * `eager: true` embarque le module ENTIER : un lecteur francophone
 * téléchargeait donc aussi l'anglais, l'allemand et l'espagnol — 356 Ko de
 * source, dont trois quarts inutiles pour lui, dans le paquet d'entrée.
 *
 * Un chargement paresseux du module unique ne changeait rien : mesuré, gain
 * nul. L'élagage de Rollup ne peut pas entrer dans un objet exporté par
 * défaut pour n'en garder qu'une clé. Séparer les fichiers est le seul
 * découpage qui déplace réellement des octets.
 *
 * Persistance de la langue
 * ------------------------
 * La langue est portée par le profil utilisateur (`utilisateur.langue`, servi
 * par l'API). `localStorage` n'est qu'un cache pour éviter un flash de langue
 * au démarrage, avant que /account/me ait répondu — voir LanguageSync.jsx.
 */

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es'];
export const FALLBACK_LANGUAGE = 'fr';

const STORAGE_KEY = 'sc_lang';

/** Normalise un code langue quelconque ('en-US', 'EN') vers une langue supportée. */
export function normalizeLanguage(value) {
  if (!value || typeof value !== 'string') return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : null;
}

export function getStoredLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function setStoredLanguage(lang) {
  const normalized = normalizeLanguage(lang);
  if (!normalized) return;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* mode privé / quota — la langue reste celle de la session en cours */
  }
}

/** Langue au tout premier rendu : cache local → langue du navigateur → français. */
function detectInitialLanguage() {
  return (
    getStoredLanguage()
    || normalizeLanguage(typeof navigator !== 'undefined' ? navigator.language : null)
    || FALLBACK_LANGUAGE
  );
}

// ── Construction des ressources ──────────────────────────────────────────────
//
// Deux globs, deux rôles.
//
// La langue de REPLI est chargée d'office : elle doit être disponible dès le
// premier rendu, sans quoi l'écran afficherait brièvement des clés brutes
// (`explorateur.nSousPlans`) à la place des libellés. C'est aussi la langue de
// la quasi-totalité des comptes.
//
// Les trois autres sont paresseuses : chaque fichier devient un morceau
// séparé, téléchargé seulement par qui bascule dessus. C'est ce découpage —
// et lui seul — qui sort réellement les octets du paquet d'entrée.
const modulesRepli = import.meta.glob('./locales/fr/*.js', { eager: true });
const modulesSecondaires = import.meta.glob('./locales/{en,de,es}/*.js');

/** `./locales/fr/chantier.js` → `chantier`. */
const nomDuNamespace = (chemin) => chemin.split('/').pop().replace(/\.js$/, '');

/** `./locales/de/chantier.js` → `de`. */
const langueDuChemin = (chemin) => chemin.split('/').at(-2);

const resources = SUPPORTED_LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang]: {} }), {});

for (const [chemin, mod] of Object.entries(modulesRepli)) {
  const dictionnaire = /** @type {{ default?: Record<string, unknown> }} */ (mod);
  resources[FALLBACK_LANGUAGE][nomDuNamespace(chemin)] = dictionnaire.default || {};
}

export const NAMESPACES = Object.keys(resources[FALLBACK_LANGUAGE]);

/** Langues dont les ressources sont posées — le repli l'est par construction. */
const languesChargees = new Set([FALLBACK_LANGUAGE]);

/**
 * Charge les traductions d'une langue secondaire. Idempotent.
 *
 * Tant qu'elles ne sont pas arrivées, i18next sert la langue de repli
 * (`fallbackLng`) : l'interface reste lisible pendant le téléchargement au lieu
 * d'afficher des clés brutes. C'est la raison pour laquelle `applyLanguage` ne
 * bascule qu'APRÈS avoir attendu cette promesse.
 *
 * Un échec (réseau coupé au mauvais moment) laisse l'interface dans la langue
 * précédente : une bascule ratée n'a jamais à casser l'écran.
 */
export async function chargerLangue(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang) || languesChargees.has(lang)) return;

  const aCharger = Object.entries(modulesSecondaires)
    .filter(([chemin]) => langueDuChemin(chemin) === lang);

  await Promise.all(aCharger.map(async ([chemin, charger]) => {
    const mod = /** @type {{ default?: Record<string, unknown> }} */ (await charger());
    i18n.addResourceBundle(lang, nomDuNamespace(chemin), mod.default || {}, true, true);
  }));

  languesChargees.add(lang);
}

/**
 * Langue voulue au démarrage — cache local, puis navigateur, puis repli.
 *
 * i18next démarre TOUJOURS sur la langue de repli, seule disponible sans
 * attendre, et bascule juste après si besoin (voir sous `init`). Démarrer
 * directement sur une langue non chargée ferait clignoter des clés brutes.
 */
const langueVoulue = detectInitialLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  // `common` est chargé par défaut : t('enregistrer') sans préfixe y pointe.
  ns: NAMESPACES,
  defaultNS: 'common',
  fallbackNS: 'common',
  interpolation: {
    // React échappe déjà les valeurs interpolées.
    escapeValue: false,
  },
  returnEmptyString: false,
  react: {
    useSuspense: false,
  },
});

/**
 * Applique la langue à i18next, au cache local et à l'attribut <html lang>.
 *
 * Les ressources sont chargées AVANT la bascule : l'inverse afficherait
 * l'interface en clés brutes le temps du téléchargement. Le cache local n'est
 * écrit qu'au succès — mémoriser une langue dont les libellés n'ont pas pu être
 * récupérés ferait revenir le problème à chaque démarrage.
 */
export async function applyLanguage(lang) {
  const normalized = normalizeLanguage(lang);
  if (!normalized || normalized === i18n.language) return;

  try {
    await chargerLangue(normalized);
  } catch {
    return;   // l'interface reste dans la langue précédente
  }

  await i18n.changeLanguage(normalized);
  setStoredLanguage(normalized);
}

// Bascule vers la langue voulue dès que ses ressources sont là. Sans effet
// quand c'est déjà le repli — le cas de la quasi-totalité des comptes.
if (langueVoulue !== FALLBACK_LANGUAGE) {
  applyLanguage(langueVoulue);
}

// <html lang="…"> suit la langue active (accessibilité, moteurs de recherche,
// césure et correction orthographique du navigateur).
function syncDocumentLang(lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', lang);
  }
}
syncDocumentLang(i18n.language);
i18n.on('languageChanged', syncDocumentLang);

// Aide au développement : bascule de langue depuis la console du navigateur
// (`__i18n.changeLanguage('de')`) sans passer par le profil. Absent du build
// de production.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Propriété maison sur `window` : une conversion suffit à le dire, plutôt
  // que d'étendre l'interface globale pour une aide de développement.
  /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window)).__i18n = i18n;
}

export default i18n;
