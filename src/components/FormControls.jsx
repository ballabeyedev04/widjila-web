import { useId } from 'react';
import i18n from '../i18n/index.js';

/**
 * Composants de formulaire réutilisables (champ + libellé + erreur + hint).
 * Tous suivent le même contrat : `label`, `error`, `hint`, + props natives.
 *
 * Les libellés sont fournis par l'appelant (déjà traduits) ; seule l'option
 * vide par défaut porte une chaîne, résolue via l'instance i18next car
 * `emptyOption` est une fonction utilitaire, pas un composant React.
 *
 * ── ACCESSIBILITÉ ─────────────────────────────────────────────────────────
 * Ce fichier est le point de passage de TOUS les formulaires de
 * l'application : ce qui est corrigé ici l'est partout à la fois.
 *
 * Le `<label>` n'était rattaché à aucun champ. Conséquences concrètes :
 *   - cliquer le libellé ne donnait pas le focus au champ ;
 *   - un lecteur d'écran annonçait « zone de saisie », sans dire laquelle ;
 *   - le message d'erreur, posé dans un `<div>` voisin, n'était jamais lu.
 *
 * `useId` fournit un identifiant stable côté client comme au rendu serveur.
 * L'appelant peut toujours passer son propre `id` : il l'emporte.
 */

/**
 * Enveloppe libellé + champ + message.
 *
 * @param {Function} children reçoit les attributs à poser sur le champ :
 *   `{ id, 'aria-describedby', 'aria-invalid' }`. Un nœud simple reste
 *   accepté pour les usages qui ne portent pas de champ unique (cases à
 *   cocher, groupes) — il est alors rendu tel quel.
 */
export function Field({ label, error, hint, required, children, className = '', id }) {
  const idAuto = useId();
  const idChamp = id || idAuto;
  const idMessage = `${idChamp}-message`;

  // Le message décrit le champ, qu'il s'agisse d'une erreur ou d'une aide :
  // les deux doivent être annoncés, et un seul est affiché à la fois.
  const decritPar = error || hint ? idMessage : undefined;

  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={idChamp}>
          {label}{' '}
          {required && (
            /* `aria-hidden` : l'astérisque est un repère visuel. L'obligation
               est portée par `required` sur le champ, que la synthèse vocale
               annonce déjà — sans quoi elle lirait « étoile ». */
            <span style={{ color: 'var(--danger)' }} aria-hidden="true">*</span>
          )}
        </label>
      )}

      {typeof children === 'function'
        ? children({ id: idChamp, 'aria-describedby': decritPar, 'aria-invalid': error ? true : undefined })
        : children}

      {error ? (
        /* `role="alert"` : une erreur apparue APRÈS le rendu (validation à la
           soumission) doit être annoncée sans que l'utilisateur ait à
           parcourir le formulaire pour la découvrir. */
        <div className="error" id={idMessage} role="alert">{error}</div>
      ) : hint ? (
        <div className="hint" id={idMessage}>{hint}</div>
      ) : null}
    </div>
  );
}

export function Input({ label, error, hint, required, className = '', ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} id={props.id}>
      {(a11y) => (
        <input
          className={`input ${error ? 'invalid' : ''} ${className}`}
          required={required}
          {...a11y}
          {...props}
        />
      )}
    </Field>
  );
}

export function Select({ label, error, hint, required, children, className = '', ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} id={props.id}>
      {(a11y) => (
        <select
          className={`select ${error ? 'invalid' : ''} ${className}`}
          required={required}
          {...a11y}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function Textarea({ label, error, hint, required, className = '', ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} id={props.id}>
      {(a11y) => (
        <textarea
          className={`textarea ${error ? 'invalid' : ''} ${className}`}
          required={required}
          {...a11y}
          {...props}
        />
      )}
    </Field>
  );
}

export function Checkbox({ label, error, ...props }) {
  return (
    <Field error={error}>
      {/* Le champ est ICI enveloppé par son `<label>` : le rattachement est
          structurel, `htmlFor` serait redondant. */}
      <label className="checkbox-row">
        <input type="checkbox" {...props} />
        <span>{label}</span>
      </label>
    </Field>
  );
}

/* Select avec option vide par défaut (placeholder) */
export const emptyOption = (label) => (
  <option value="">{label ?? i18n.t('layout:formulaire.selectionner')}</option>
);
