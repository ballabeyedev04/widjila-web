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

const SwalCustom = Swal.mixin({
  confirmButtonColor: '#f2600c',
  cancelButtonColor: '#eef1f4',
  reverseButtons: true,
  focusConfirm: false,
  customClass: {
    container: 'swal-custom-container',
  },
});

/** Ouvre une notification centrée (titre + description), auto-fermeture élégante. */
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
 * Confirmation — deux boutons « Confirmer » / « Annuler ».
 * `danger: true` colore le bouton en rouge (actions destructives).
 * Résout `true` si confirmé, `false` si annulé.
 */
SwalCustom.confirm = async ({
  title,
  text = '',
  icon = 'warning',
  danger = false,
  confirmText,
} = {}) => {
  const result = await SwalCustom.fire({
    title: title ?? i18n.t('common:messages.confirmationTitre'),
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText ?? i18n.t('common:actions.confirmer'),
    cancelButtonText: i18n.t('common:actions.annuler'),
    customClass: { confirmButton: danger ? 'swal-confirm-danger' : undefined },
  });
  return Boolean(result.isConfirmed);
};

export default SwalCustom;
