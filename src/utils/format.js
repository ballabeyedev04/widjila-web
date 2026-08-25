/* Helpers de formatage partagés. */

import i18n from '../i18n/index.js';

/**
 * Locale Intl correspondant à la langue active de l'interface.
 *
 * Anglais → en-GB (et non en-US) : les marchés visés sont européens et
 * africains francophones, où la date se lit JJ/MM/AAAA.
 *
 * Ces fonctions lisent la langue au moment de l'appel. Appelées depuis un
 * composant abonné à i18next (`useTranslation`), elles sont ré-évaluées au
 * changement de langue — c'est le cas de toutes les pages traduites.
 */
const LOCALES = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', es: 'es-ES' };

const locale = () => LOCALES[i18n.language] || LOCALES.fr;

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale(), {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const formatNombre = (value) => {
  if (value === null || value === undefined) return '0';

  // `Intl.NumberFormat` convertit son argument en nombre : toute chaîne non
  // numérique en ressort « NaN ». Plusieurs écrans passent un placeholder
  // (« — ») quand la donnée manque, et affichaient donc « NaN » à l'écran.
  // On le rend tel quel : c'est déjà la marque d'absence voulue.
  const nombre = Number(value);
  if (Number.isNaN(nombre)) return String(value);

  return new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(nombre);
};

export const formatBudget = (value) => {
  if (value === null || value === undefined) return '—';
  // La devise reste l'euro (tarification du produit) ; seule la mise en forme
  // — position du symbole, séparateurs — suit la langue de l'utilisateur.
  return new Intl.NumberFormat(locale(), {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(value);
};

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const initials = (nom, prenom) =>
  `${(prenom || '')?.[0] || ''}${(nom || '')?.[0] || ''}`.toUpperCase() || '—';

/** Valeur pour un <input type="date"> — format ISO, indépendant de la locale. */
export const toDateInputValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
