import Swal from 'sweetalert2';
import i18n from '../i18n/index.js';

/**
 * SweetAlert2 — instance partagée pour TOUTES les retours utilisateur de l'admin.
 *
 * Messages de succès / erreur / info / avertissement et confirmations :
 * affichés au CENTRE de l'écran, avec un titre + une description, dans un
 * style soigné et professionnel.
 *
 * API :
 *   SwalCustom.success({ title, text })   •   SwalCustom.success('Action réussie')
 *   SwalCustom.error({ title, text })     •   SwalCustom.error('Détail de l'erreur')
 *   SwalCustom.info({ title, text })      •   SwalCustom.warning({ title, text })
 *   SwalCustom.confirm({ title, text, icon, danger, confirmText }) → Promise<boolean>
 *   SwalCustom.fire({...}) : modale SweetAlert2 libre (cas particulier).
 *
 * Chaque helper accepte un objet `{ title, text }` (titre + description) ou une
 * simple chaîne :
 *   - success / info / warning('…')  → titre = la chaîne, description par défaut ;
 *   - error('…')                     → titre = « Une erreur est survenue »,
 *                                       description = la chaîne fournie.
 *
 * i18n : ce module n'est pas un composant React (pas de hook `useTranslation`
 * possible) — `i18n.t()` est appelé DANS chaque fonction, jamais au chargement
 * du module, pour refléter la langue active AU MOMENT de l'affichage (un
 * changement de langue en cours de session doit s'appliquer immédiatement,
 * pas seulement après un rechargement de page).
 *
 * Ne plus utiliser `toast` (react-toastify) ni `window.confirm`.
 */

/** Description par défaut quand seul un titre (ou une chaîne) est fourni. */
const defaultsFor = (type) => ({
  success: { title: i18n.t('common:messages.operationReussie'), text: i18n.t('common:messages.operationReussieTexte') },
  error: { title: i18n.t('common:messages.uneErreurEstSurvenue'), text: i18n.t('common:messages.veuillezReessayerOuVerifier') },
  info: { title: i18n.t('common:messages.information'), text: '' },
  warning: { title: i18n.t('common:messages.attention'), text: '' },
}[type]);

/** Normalise l'argument (objet {title,text} ou chaîne) en { title, text }. */
const normalize = (input, type) => {
  const defaults = defaultsFor(type);
  if (typeof input === 'string') {
    // Erreur : la chaîne est le détail → elle devient la description.
    if (type === 'error') return { title: defaults.title, text: input };
    // Succès / info / warning : la chaîne devient le titre.
    return { title: input, text: defaults.text };
  }
  const obj = input || {};
  return {
    title: obj.title ?? defaults.title,
    text: obj.text ?? defaults.text,
  };
};

/**
 * Ce qu'accepte un helper de notification : un objet, ou une simple chaîne.
 * @typedef {{ title?: string, text?: string }} EntreeNotification
 */

/**
 * Les méthodes ajoutées au mixin. TypeScript ne peut pas les déduire — on les
 * déclare, ce qui documente au passage la surface réellement utilisée par les
 * écrans.
 *
 * @typedef {import('sweetalert2').default & {
 *   success: (input: EntreeNotification | string) => Promise<unknown>,
 *   error:   (input: EntreeNotification | string) => Promise<unknown>,
 *   info:    (input: EntreeNotification | string) => Promise<unknown>,
 *   warning: (input: EntreeNotification | string) => Promise<unknown>,
 *   confirm: (options?: {
 *     title?: string, text?: string, html?: string,
 *     icon?: import('sweetalert2').SweetAlertIcon,
 *     danger?: boolean, confirmText?: string,
 *     confirmButtonText?: string, cancelButtonText?: string,
 *     showCancelButton?: boolean, reverseButtons?: boolean,
 *   }) => Promise<boolean>,
 * }} SwalPersonnalise
 */

// Conversion et non annotation : les cinq helpers sont greffés PLUS BAS, et
// une annotation sur la déclaration exigerait qu'ils soient déjà présents.
const SwalCustom = /** @type {SwalPersonnalise} */ (/** @type {unknown} */ (Swal.mixin({
  confirmButtonColor: '#f2600c',
  cancelButtonColor: '#eef1f4',
  reverseButtons: true,
  focusConfirm: false,
  customClass: {
    container: 'swal-custom-container',
  },
})));

/* ── Titres en TEXTE, jamais en HTML — correctif XSS (audit sécurité) ──────
 *
 * Pour SweetAlert2, `title` est du HTML : la bibliothèque le parse et insère
 * les nœuds obtenus dans la page. Seul `titleText` est du texte. Et i18next
 * tourne avec `escapeValue: false` (React échappe déjà ce qu'il affiche) :
 * un nom interpolé dans « Supprimer {{nom}} ? » arrivait donc TEL QUEL.
 *
 * Ces noms sont saisis par d'autres — l'inscription publique suffit à en
 * choisir un. Un compte nommé `<img src=x onerror=…>` exécutait son script
 * dans la session du super-admin au moment où celui-ci cliquait « Supprimer »
 * ou « Suspendre » sur sa ligne.
 *
 * La conversion est faite ICI, sur `fire` lui-même, et pas écran par écran :
 * les helpers ci-dessous, et tout appel direct à `SwalCustom.fire`, passent
 * par ce point. Le seul canal HTML qui subsiste est l'option `html`,
 * explicite : l'appelant qui l'emploie échappe lui-même ce qu'il interpole
 * (voir Login.jsx). Vérifié par swal.securite.test.js, avec la vraie
 * bibliothèque.
 */
const titreEnTexte = (options) => {
  if (!options || typeof options.title !== 'string') return options;
  const { title, ...reste } = options;
  return { ...reste, titleText: title };
};

const fireBrut = SwalCustom.fire.bind(SwalCustom);
SwalCustom.fire = (...args) => {
  // Forme positionnelle `fire(titre, corps, icône)` : pour SweetAlert2, le
  // corps y est du HTML lui aussi. On la ramène à des options en texte.
  if (typeof args[0] !== 'object' || args[0] === null) {
    const [title, text, icon] = args;
    return fireBrut(titreEnTexte(Object.fromEntries(
      Object.entries({ title, text, icon }).filter(([, v]) => v !== undefined)
    )));
  }
  return fireBrut(titreEnTexte(args[0]));
};

/** Ouvre une notification centrée (titre + description), auto-fermeture élégante. */
/**
 * @param {import('sweetalert2').SweetAlertIcon} type
 * @param {EntreeNotification | string} input
 * @param {number} timer
 */
const notifier = (type, input, timer) => {
  const { title, text } = normalize(input, type);
  return SwalCustom.fire({
    icon: type,
    title,
    text,
    timer,
    timerProgressBar: true,
    showConfirmButton: true,
    confirmButtonText: i18n.t('common:actions.ok'),
    showCloseButton: false,
    allowOutsideClick: true,
    didOpen: (el) => {
      el.addEventListener('mouseenter', Swal.stopTimer);
      el.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });
};

/** Message de succès — modale centrée, auto-fermeture. */
SwalCustom.success = (input) => notifier('success', input, 2400);

/** Message d'erreur — modale centrée, laissée à l'écran plus longtemps. */
SwalCustom.error = (input) => notifier('error', input, 5000);

/** Message d'information — modale centrée. */
SwalCustom.info = (input) => notifier('info', input, 3000);

/** Message d'avertissement — modale centrée. */
SwalCustom.warning = (input) => notifier('warning', input, 3200);

/**
 * Options d'une confirmation.
 *
 * @typedef {object} OptionsConfirmation
 * @property {string} [title]   Titre. Défaut : « Confirmation ».
 * @property {string} [text]    Corps en texte brut.
 * @property {string} [html]    Corps en HTML — pour un message qui porte de la
 *   mise en forme. Prend le pas sur `text` quand les deux sont fournis.
 * @property {import('sweetalert2').SweetAlertIcon} [icon]  Défaut : `warning`.
 * @property {boolean} [danger] Colore le bouton en rouge (action destructive).
 * @property {string} [confirmText]        Libellé du bouton de confirmation.
 * @property {string} [confirmButtonText]  Synonyme de `confirmText`.
 * @property {string} [cancelButtonText]   Libellé du bouton d'annulation.
 */

/**
 * Confirmation — deux boutons « Confirmer » / « Annuler ».
 * Résout `true` si confirmé, `false` sinon.
 *
 * ── Ce qui a été corrigé ──────────────────────────────────────────────────
 *
 * Cette fonction ne déstructurait que cinq clés et jetait tout le reste, sans
 * erreur ni avertissement. `Login.jsx` lui passait `html`,
 * `confirmButtonText` et `cancelButtonText` : les trois disparaissaient. La
 * boîte d'avertissement de fin d'essai s'affichait donc AVEC UN CORPS VIDE —
 * le message expliquant l'échéance n'arrivait jamais — et des boutons
 * génériques à la place de « Voir les plans » et « Plus tard ».
 *
 * Les options sont désormais explicites et documentées. Ajouter une option
 * demande de l'ajouter ICI, ce qui est justement le point : une option non
 * déclarée doit se voir, pas se perdre.
 *
 * @param {OptionsConfirmation} [options]
 * @returns {Promise<boolean>}
 */
SwalCustom.confirm = async ({
  title,
  text = '',
  html,
  icon = 'warning',
  danger = false,
  confirmText,
  confirmButtonText,
  cancelButtonText,
} = {}) => {
  const result = await SwalCustom.fire({
    title: title ?? i18n.t('common:messages.confirmationTitre'),
    // `html` l'emporte : un appelant qui prend la peine de mettre en forme son
    // message ne veut pas qu'on serve sa version brute à la place.
    ...(html ? { html } : { text }),
    icon,
    showCancelButton: true,
    confirmButtonText: confirmButtonText ?? confirmText ?? i18n.t('common:actions.confirmer'),
    cancelButtonText: cancelButtonText ?? i18n.t('common:actions.annuler'),
    customClass: { confirmButton: danger ? 'swal-confirm-danger' : undefined },
  });
  return Boolean(result.isConfirmed);
};

export default SwalCustom;
