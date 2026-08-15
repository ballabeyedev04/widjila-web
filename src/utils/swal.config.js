import Swal from 'sweetalert2';

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
 * Ne plus utiliser `toast` (react-toastify) ni `window.confirm`.
 */

/* Description par défaut quand seul un titre (ou une chaîne) est fourni. */
const DEFAULTS = {
  success: { title: 'Opération réussie', text: "L'opération s'est déroulée avec succès." },
  error: { title: 'Une erreur est survenue', text: 'Merci de réessayer ou de vérifier votre saisie.' },
  info: { title: 'Information', text: '' },
  warning: { title: 'Attention', text: '' },
};

/** Normalise l'argument (objet {title,text} ou chaîne) en { title, text }. */
const normalize = (input, type) => {
  if (typeof input === 'string') {
    // Erreur : la chaîne est le détail → elle devient la description.
    if (type === 'error') return { title: DEFAULTS.error.title, text: input };
    // Succès / info / warning : la chaîne devient le titre.
    return { title: input, text: DEFAULTS[type].text };
  }
  const obj = input || {};
  return {
    title: obj.title ?? DEFAULTS[type].title,
    text: obj.text ?? DEFAULTS[type].text,
  };
};

const SwalCustom = Swal.mixin({
  confirmButtonColor: '#1e3a5f',
  cancelButtonColor: '#eef1f4',
  confirmButtonText: 'Confirmer',
  cancelButtonText: 'Annuler',
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
    confirmButtonText: 'OK',
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
  title = 'Confirmation',
  text = '',
  icon = 'warning',
  danger = false,
  confirmText = 'Confirmer',
} = {}) => {
  const result = await SwalCustom.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    customClass: { confirmButton: danger ? 'swal-confirm-danger' : undefined },
  });
  return Boolean(result.isConfirmed);
};

export default SwalCustom;
