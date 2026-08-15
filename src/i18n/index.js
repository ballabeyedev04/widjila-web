import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Internationalisation (module 1 — « Gestion des langues »).
 *
 * Langues supportées : français, anglais, allemand, espagnol.
 *
 * Chargement des traductions
 * --------------------------
 * Chaque fichier de `./locales/*.js` est un *namespace* qui exporte les quatre
 * langues côte à côte :
 *
 *     export default {
 *       fr: { titre: 'Chantiers' },
 *       en: { titre: 'Projects' },
 *       de: { titre: 'Baustellen' },
 *       es: { titre: 'Obras' },
 *     };
 *
 * Les fichiers sont découverts automatiquement (import.meta.glob de Vite) :
 * ajouter un namespace ne demande aucune modification ici. Le nom du fichier
 * devient le nom du namespace (`chantier.js` → `t('chantier:titre')`).
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

// ── Construction des ressources depuis ./locales/*.js ────────────────────────
const modules = import.meta.glob('./locales/*.js', { eager: true });

const resources = SUPPORTED_LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang]: {} }), {});

for (const [path, mod] of Object.entries(modules)) {
  const namespace = path.replace('./locales/', '').replace(/\.js$/, '');
  const dictionary = mod.default || {};
  for (const lang of SUPPORTED_LANGUAGES) {
    resources[lang][namespace] = dictionary[lang] || {};
  }
}

export const NAMESPACES = Object.keys(resources[FALLBACK_LANGUAGE]);

i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
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

/** Applique la langue à i18next, au cache local et à l'attribut <html lang>. */
export function applyLanguage(lang) {
  const normalized = normalizeLanguage(lang);
  if (!normalized || normalized === i18n.language) return;
  i18n.changeLanguage(normalized);
  setStoredLanguage(normalized);
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
  window.__i18n = i18n;
}

export default i18n;
