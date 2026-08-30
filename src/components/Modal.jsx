import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Éléments qu'un navigateur place dans l'ordre de tabulation. */
const FOCUSABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Modale accessible : fermeture par Échap, clic sur le fond ou bouton X.
 * `onClose` est appelé à la fermeture.
 *
 * ── GESTION DU FOCUS ──────────────────────────────────────────────────────
 * `aria-modal` annonce à la synthèse vocale que le reste de la page est
 * inerte, mais ne rend RIEN inerte au clavier : sans piège de focus, Tab
 * continuait de parcourir les champs situés derrière la modale. Un
 * utilisateur au clavier se retrouvait à saisir dans un formulaire masqué,
 * sans aucun repère visuel — et ne pouvait plus revenir aux boutons de la
 * modale qu'en tabulant à travers toute la page.
 *
 * Trois comportements sont donc assurés ici :
 *   1. à l'ouverture, le focus entre dans la modale ;
 *   2. Tab et Maj+Tab bouclent à l'intérieur ;
 *   3. à la fermeture, le focus revient à l'élément qui l'avait avant —
 *      sinon il retombe sur `<body>` et la navigation clavier repart du haut
 *      de la page, ce qui perd complètement l'utilisateur.
 */
export default function Modal({ open, onClose, title, children, footer, size }) {
  const { t } = useTranslation('layout');
  const dialogueRef = useRef(null);
  const idTitre = useId();

  useEffect(() => {
    if (!open) return undefined;

    // Mémorisé AVANT de déplacer le focus : c'est là que l'utilisateur
    // reviendra à la fermeture.
    const elementPrecedent = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const racine = dialogueRef.current;
      if (!racine) return;

      // Pas de filtre sur la visibilité : `offsetParent` vaut `null` pour tout
      // élément sans mise en page calculée, ce qui réduisait la liste au seul
      // élément actif et neutralisait complètement le piège. Aucune modale de
      // cette application ne masque de champ focusable.
      const cibles = [...racine.querySelectorAll(FOCUSABLES)];
      if (!cibles.length) return;

      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];

      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    // Le premier champ du CORPS, et non le premier élément focusable de la
    // boîte : ce dernier est le bouton de fermeture, qui ouvre l'écran sur
    // « fermer » au lieu du contenu. À défaut de champ, on retombe sur la
    // boîte elle-même pour qu'Échap et Tab partent bien de l'intérieur.
    const corps = dialogueRef.current?.querySelector('.modal-body');
    const premierChamp = corps?.querySelector(FOCUSABLES)
      || dialogueRef.current?.querySelector(FOCUSABLES);
    (premierChamp || dialogueRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      // `focus` peut ne plus exister si l'élément a disparu du DOM entre-temps.
      if (typeof elementPrecedent?.focus === 'function') elementPrecedent.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={dialogueRef}
        className={`modal ${size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : ''}`}
        role="dialog"
        aria-modal="true"
        // Sans cela, la synthèse vocale annonce « boîte de dialogue » sans
        // dire laquelle.
        aria-labelledby={idTitre}
        // `-1` : la boîte n'entre pas dans l'ordre de tabulation, mais peut
        // recevoir le focus par programme quand elle ne contient aucun champ.
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 id={idTitre}>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label={t('actions.fermer')}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
